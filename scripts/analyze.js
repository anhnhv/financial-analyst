#!/usr/bin/env node
/**
 * AI-powered stock analysis script.
 * Reads a fetched stock JSON file, sends it to the Google AI service,
 * and writes a structured analysis result to the output/ directory.
 *
 * Usage:
 *   node scripts/analyze.js <inputFile> [outputFile]
 *
 * Examples:
 *   node scripts/analyze.js output/VNM.json
 *   node scripts/analyze.js output/VNM.json output/VNM_analysis.json
 */

'use strict';

require('dotenv').config();

const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { join, dirname, basename, extname } = require('node:path');
const { generate } = require('../src/services/googleAiService');

const OUTPUT_DIR = join(__dirname, '..', 'output');

// ─── helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function deriveOutputPath(inputPath) {
  const name = basename(inputPath, extname(inputPath));
  return join(OUTPUT_DIR, `${name}_analysis.json`);
}

/**
 * Build a compact, token-efficient summary from the raw stock JSON
 * to avoid hitting free-tier context limits.
 */
function buildPromptData(stock) {
  const sections = [];

  if (stock.overview) {
    sections.push(`## Company Overview\n${JSON.stringify(stock.overview, null, 2)}`);
  }

  // For financial tables, send periods + first ~20 rows to keep prompt small
  for (const key of ['incomeStatement', 'balanceSheet', 'cashFlow', 'ratios', 'summaryReport']) {
    const table = stock[key];
    if (!table || !table.periods || !table.rows) continue;

    const label = {
      incomeStatement: 'Income Statement',
      balanceSheet: 'Balance Sheet',
      cashFlow: 'Cash Flow Statement',
      ratios: 'Financial Ratios',
      summaryReport: 'Summary Report',
    }[key];

    const trimmedRows = table.rows.slice(0, 20).map((row) => ({
      item: row.item,
      ...(row.unit ? { unit: row.unit } : {}),
      values: row.values,
    }));

    sections.push(
      `## ${label}\nPeriods: ${table.periods.join(', ')}\n` +
        JSON.stringify(trimmedRows, null, 2),
    );
  }

  // Recent price data — last 10 entries only
  if (Array.isArray(stock.price) && stock.price.length > 0) {
    const recent = stock.price.slice(-10);
    sections.push(`## Recent Price Data (last ${recent.length} entries)\n${JSON.stringify(recent, null, 2)}`);
  }

  return sections.join('\n\n');
}

// const SYSTEM_INSTRUCTION = `Bạn là một chuyên gia phân tích tài chính cấp cao, có kinh nghiệm làm việc tại các quỹ đầu tư tổ chức, ngân hàng đầu tư và công ty quản lý tài sản. Phân tích doanh nghiệp này không đứng trên góc nhìn của nhà đầu tư nhỏ lẻ, hãy dựa vào những phân tích mang tính chuyên môn cao.

// Yêu cầu phân tích bao gồm:
// - Chất lượng lợi nhuận (earnings quality): phân biệt lợi nhuận từ hoạt động kinh doanh cốt lõi vs phi cốt lõi
// - Phân tích cấu trúc chi phí và đòn bẩy hoạt động (operating leverage)
// - Chỉ số hiệu quả vốn: ROIC, ROE, ROA và xu hướng qua các kỳ
// - Phân tích dòng tiền tự do (FCF) và khả năng chuyển đổi lợi nhuận thành tiền mặt
// - Cấu trúc vốn và rủi ro đòn bẩy tài chính (financial leverage)
// - Định giá tương đối dựa trên dữ liệu có sẵn
// - Rủi ro tập trung, rủi ro ngành và rủi ro vĩ mô

// Trả về ONLY một JSON object hợp lệ (không có markdown, không có văn xuôi bên ngoài JSON) theo schema sau:

// {
//   "ticker": string,
//   "analysedAt": ISO8601 string,
//   "executiveSummary": string (tóm tắt chuyên sâu 3-5 câu từ góc nhìn tổ chức),
//   "earningsQuality": {
//     "assessment": "high" | "medium" | "low",
//     "coreVsNonCoreBreakdown": string,
//     "cashConversionComment": string
//   },
//   "profitabilityAnalysis": {
//     "grossMarginTrend": "expanding" | "stable" | "compressing" | "mixed",
//     "operatingMarginTrend": "expanding" | "stable" | "compressing" | "mixed",
//     "netMarginTrend": "expanding" | "stable" | "compressing" | "mixed",
//     "operatingLeverageComment": string
//   },
//   "returnMetrics": {
//     "roeTrend": "improving" | "stable" | "deteriorating",
//     "roaTrend": "improving" | "stable" | "deteriorating",
//     "roicComment": string
//   },
//   "cashFlowAnalysis": {
//     "fcfQuality": "strong" | "adequate" | "weak" | "insufficient data",
//     "comment": string
//   },
//   "capitalStructure": {
//     "leverageLevel": "conservative" | "moderate" | "aggressive",
//     "debtServiceComment": string
//   },
//   "keyMetrics": {
//     "latestRevenue": number | null,
//     "latestNetProfit": number | null,
//     "latestGrossMarginPct": number | null,
//     "latestOperatingMarginPct": number | null,
//     "latestNetMarginPct": number | null
//   },
//   "catalysts": string[],
//   "risks": [
//     { "risk": string, "severity": "high" | "medium" | "low", "mitigant": string }
//   ],
//   "institutionalOutlook": "overweight" | "neutral" | "underweight",
//   "investmentThesis": string (2-3 câu luận điểm đầu tư chuyên nghiệp),
//   "disclaimer": "Phân tích này được tạo bởi AI chỉ phục vụ mục đích thông tin, không cấu thành khuyến nghị đầu tư chính thức."
// }`;

const SYSTEM_INSTRUCTION = `Bạn là một chuyên gia phân tích tài chính doanh nghiệp cấp cao (corporate finance
& credit analyst), không phải tư vấn đầu tư nhỏ lẻ. Hãy phân tích toàn diện doanh
nghiệp dựa trên dữ liệu tài chính tôi cung cấp, theo đúng trình tự và tiêu chuẩn
dưới đây.

━━━━━━━━━━━━━━━━━━━━━━━━━━
YÊU CẦU PHÂN TÍCH — thực hiện theo đúng thứ tự
━━━━━━━━━━━━━━━━━━━━━━━━━━

BƯỚC 1 — NHẬN DIỆN HỒ SƠ DOANH NGHIỆP
Xác định ngành, mô hình kinh doanh, đặc trưng cấu trúc vốn dựa trên tỷ trọng
tài sản cố định, chu kỳ tiền mặt, và biên lợi nhuận. Không đoán tên công ty.

BƯỚC 2 — CHẤT LƯỢNG TĂNG TRƯỞNG
- Tính CAGR doanh thu, LNST, EPS
- Phân tách: tăng trưởng đến từ mở rộng quy mô vốn hay cải thiện năng suất?
- Kiểm tra: doanh thu/vốn điều lệ, LNST/vốn điều lệ có tăng không?
- Đánh giá biên lợi nhuận gộp qua các năm: mở rộng hay thu hẹp? Tại sao?

BƯỚC 3 — PHÂN TÍCH TĂNG VỐN & PHA LOÃNG
- Lập bảng so sánh: tốc độ tăng vốn điều lệ vs. tốc độ tăng EPS từng năm
- Phân loại từng đợt tăng vốn: accretive (EPS tăng nhanh hơn pha loãng) hay
  dilutive?
- Tính index (gốc = 100): vốn ĐL, EPS, LNST, doanh thu — đặt lên cùng biểu đồ
- Kết luận: tăng vốn tạo ra hay phá hủy giá trị kinh tế?

BƯỚC 4 — CẤU TRÚC NỢ & RỦI RO ĐÒN BẨY
- Vay/VCSH, Vay/EBITDA, EBIT/Lãi vay — so sánh với ngưỡng tín dụng quốc tế
  (investment grade ≤3.5x Vay/EBITDA; coverage ≥2x)
- Phân loại credit profile: investment grade / BB / high-yield?
- Phân tích nguồn gốc deleveraging: từ OCF tự thân hay từ equity injection?
- Tính: nếu lãi suất tăng thêm 100bps, tác động đến LNST và coverage ratio là bao
  nhiêu?

BƯỚC 5 — CHẤT LƯỢNG DÒNG TIỀN
- So sánh OCF vs. LNST kế toán từng năm: tỷ lệ chuyển hóa
- Free Cash Flow = OCF - CAPEX: đủ tự trả nợ không?
- OCF/vốn điều lệ theo năm: năng suất tiền mặt có cải thiện không?
- Giai đoạn nào doanh nghiệp đang ở: đầu tư (CAPEX cao) hay thu hoạch (CAPEX thấp)?

BƯỚC 6 — PHÂN TÍCH THEO QUÝ (nếu có dữ liệu)
- Xác định tính mùa vụ: quý nào thường mạnh/yếu về doanh thu và biên?
- So sánh YoY từng quý gần nhất: xu hướng đang tốt lên hay xấu đi?
- Phát hiện tín hiệu bất thường: chi phí lãi vay, phải thu, hàng tồn kho đột biến?
- Đánh giá quý mới nhất trong bối cảnh mùa vụ lịch sử

BƯỚC 7 — PHÂN TÍCH DUPONT 3 NHÂN TỐ
Tách ROE = Biên LNST × Vòng quay tài sản × Đòn bẩy tài chính
- Nhân tố nào đang cải thiện, nhân tố nào kéo ngược?
- ROE có đang vượt chi phí vốn chủ sở hữu ước tính không?

BƯỚC 8 — ĐỊNH GIÁ & KỊCH BẢN
- So sánh P/E, EV/EBITDA, P/B hiện tại với lịch sử và ngành
- Thị trường đang chiết khấu rủi ro gì vào giá?
- Xây dựng 3 kịch bản (thận trọng / cơ sở / tích cực) với giả định rõ ràng về:
  lãi suất, tăng trưởng doanh thu, biên lợi nhuận, tăng vốn
- Tính EPS forward và target price cho từng kịch bản

BƯỚC 9 — RỦI RO HỆ THỐNG & ĐẶC THÙ
Liệt kê tối đa 5 rủi ro, mỗi rủi ro kèm: xác suất / mức độ tác động / chỉ số
cần theo dõi (early warning indicator)

━━━━━━━━━━━━━━━━━━━━━━━━━━
YÊU CẦU TRÌNH BÀY
━━━━━━━━━━━━━━━━━━━━━━━━━━
- Dùng số liệu cụ thể, không nói chung chung
- Mỗi kết luận phải có con số dẫn chứng
- Phân biệt rõ: đây là cải thiện thực chất hay chỉ do quy mô vốn mở rộng?
- Tạo biểu đồ/bảng trực quan nếu có thể
- Kết thúc bằng 1 đoạn tóm tắt executive summary không quá 150 từ`;


// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/analyze.js <inputFile> [outputFile]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || deriveOutputPath(inputPath);

  log(`Reading: ${inputPath}`);
  let stock;
  try {
    const raw = await readFile(inputPath, 'utf8');
    stock = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read/parse input file: ${err.message}`);
    process.exit(1);
  }

  const ticker = stock.ticker || basename(inputPath, extname(inputPath));
  log(`Analysing ${ticker} with AI model...`);

  const promptData = buildPromptData(stock);
  const prompt = `phân tích doanh nghiệp này, không đứng trên góc nhìn của nhà đầu tư nhỏ lẻ, hãy dựa vào những phân tích mang tính chuyên môn cao.\n\nDữ liệu tài chính của ${ticker}:\n\n${promptData}`;

  let responseText;
  try {
    responseText = await generate(prompt, SYSTEM_INSTRUCTION);
  } catch (err) {
    console.error(`AI generation failed: ${err.message}`);
    process.exit(1);
  }

  // Save raw response before any formatting
  const rawOutputPath = outputPath.replace(/\.json$/, '_raw.txt');
  await mkdir(dirname(rawOutputPath), { recursive: true });
  await writeFile(rawOutputPath, responseText, 'utf8');
  log(`Raw response saved to: ${rawOutputPath}`);

  // Strip markdown code fences if the model wraps its output
  const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let analysis;
  try {
    analysis = JSON.parse(cleaned);
  } catch {
    // If parsing fails, preserve raw text so the caller can inspect it
    log('Warning: AI response was not valid JSON — saving raw text instead.');
    analysis = { ticker, analysedAt: new Date().toISOString(), rawResponse: cleaned };
  }

  // Ensure metadata fields are present
  analysis.ticker = analysis.ticker || ticker;
  analysis.analysedAt = analysis.analysedAt || new Date().toISOString();
  analysis.sourceFile = inputPath;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(analysis, null, 2), 'utf8');
  log(`Analysis saved to: ${outputPath}`);
}

main();
