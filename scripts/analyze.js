#!/usr/bin/env node
/**
 * AI-powered stock analysis script.
 * Accepts a ticker code and automatically reads <ticker>_yearly.json and
 * <ticker>_quarterly.json from ./output/, sends them to the Google AI service,
 * and writes a structured analysis result to the output/ directory.
 *
 * Usage:
 *   node scripts/analyze.js <ticker> [--output <outputFile>]
 *
 * Examples:
 *   node scripts/analyze.js PNJ
 *   node scripts/analyze.js VNM --output output/VNM_analysis.txt
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

/**
 * Build a compact, token-efficient summary from the raw stock JSON
 * to avoid hitting free-tier context limits.
 */
function buildPromptData(stock) {
  const sections = [];

  if (stock.overview) {
    sections.push(`## Company Overview\n${JSON.stringify(stock.overview, null, 2)}`);
  }

  const LABELS = {
    incomeStatement: 'Income Statement',
    balanceSheet: 'Balance Sheet',
    cashFlow: 'Cash Flow Statement',
    ratios: 'Financial Ratios',
    summaryReport: 'Summary Report',
  };

  for (const key of Object.keys(LABELS)) {
    const table = stock[key];
    if (!table) continue;

    const label = LABELS[key];

    // Format A: { periods, rows } — KBS-style
    if (table.periods && table.rows) {
      const rows = table.rows.map((row) => ({
        item: row.item,
        ...(row.unit ? { unit: row.unit } : {}),
        values: row.values,
      }));
      sections.push(`## ${label}\nPeriods: ${table.periods.join(', ')}\n${JSON.stringify(rows, null, 2)}`);
      continue;
    }

    // Format B: flat array — VCI-style (each element is one period's data)
    if (Array.isArray(table) && table.length > 0) {
      sections.push(`## ${label}\n${JSON.stringify(table, null, 2)}`);
    }
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

const SYSTEM_INSTRUCTION = `Bạn là một chuyên gia phân tích tài chính doanh nghiệp cấp cao (corporate finance & credit analyst), có kinh nghiệm làm việc tại các quỹ đầu tư tổ chức, ngân hàng đầu tư và công ty quản lý tài sản. Không phải tư vấn đầu tư nhỏ lẻ.

Hãy viết một báo cáo phân tích chuyên sâu toàn diện bằng Markdown, theo đúng 9 bước dưới đây. Mỗi bước PHẢI có bảng số liệu cụ thể được tính toán từ dữ liệu, nhận xét phân tích chi tiết, và kết luận rõ ràng. Không được bỏ qua hay rút gọn bất kỳ bước nào.

━━━━━━━━━━━━━━━━━━━━━━━━━━
ĐỊNH DẠNG BẮT BUỘC
━━━━━━━━━━━━━━━━━━━━━━━━━━
- Toàn bộ output là Markdown hợp lệ với headers (##, ###), bảng (| col | col |), và bullet points
- Mỗi bảng số liệu phải có ít nhất 3–4 cột năm/quý để thấy được xu hướng
- Các phát hiện quan trọng phải được đánh dấu bằng **in đậm** và nhãn như **PHÁT HIỆN QUAN TRỌNG:** hoặc **Cảnh báo:**
- Tất cả số liệu phải được tính toán cụ thể (CAGR, %, bội số) — KHÔNG được nói chung chung như "tăng trưởng tốt"
- Chiều dài tối thiểu mỗi bước: ít nhất 1 bảng + 3 đoạn phân tích

━━━━━━━━━━━━━━━━━━━━━━━━━━
CẤU TRÚC BÁO CÁO — thực hiện ĐẦY ĐỦ từng bước
━━━━━━━━━━━━━━━━━━━━━━━━━━

## BƯỚC 1 — NHẬN DIỆN HỒ SƠ DOANH NGHIỆP
- Xác định ngành, mô hình kinh doanh cốt lõi (B2B/B2C, sản phẩm/dịch vụ, kênh phân phối)
- Lập bảng tóm tắt các chỉ tiêu nhận dạng: tỷ trọng TSCD/tổng TS, hàng tồn kho/TSNH, chu kỳ tiền mặt (CCC), biên gộp đặc trưng
- Nhận định: đặc trưng nào của ngành chi phối toàn bộ mô hình rủi ro/lợi nhuận?

## BƯỚC 2 — CHẤT LƯỢNG TĂNG TRƯỞNG
- Bảng CAGR: tính CAGR doanh thu, LNST, EPS cho giai đoạn 3 năm gần nhất (viết công thức: [(Vt/V0)^(1/n) - 1])
- Bảng biên lợi nhuận qua từng năm: Biên gộp (%), Biên vận hành (%), Biên LNST (%) — nhận xét từng xu hướng
- Bảng năng suất vốn: Doanh thu/Vốn ĐL, LNST/Vốn ĐL qua các năm
- Phân tách rõ: tăng trưởng đến từ mở rộng quy mô hay cải thiện năng suất? Dẫn chứng bằng số
- Nhận định về chất lượng lợi nhuận: recurring vs. one-off, core vs. non-core

## BƯỚC 3 — PHÂN TÍCH TĂNG VỐN & PHA LOÃNG
- Bảng Index so sánh (gốc năm đầu = 100): Vốn ĐL, Số CP lưu hành, Doanh thu, LNST (parent), EPS basic, EBITDA — qua từng năm
- Bảng phân loại từng đợt tăng vốn: Giai đoạn | Vốn ĐL tăng (%) | EPS tăng (%) | Phân loại (Accretive/Dilutive/Highly Dilutive)
- Tổng kết: cổ đông chịu pha loãng X% nhưng được bù đắp bao nhiêu % tăng trưởng LNST?
- Kết luận: tăng vốn tạo ra hay phá hủy giá trị kinh tế?

## BƯỚC 4 — CẤU TRÚC NỢ & RỦI RO ĐÒN BẨY
- Bảng tổng dư nợ tài chính: Vay ngắn hạn | Vay dài hạn | Tổng vay | Tiền mặt | Net Debt — qua từng năm
- Bảng các chỉ số leverage với ngưỡng tham chiếu quốc tế:
  | Chỉ số | Năm1 | Năm2 | ... | Ngưỡng IG | Nhận xét |
  Bao gồm: Gross Debt/EBITDA, Net Debt/EBITDA, EBIT/Interest, EBITDA/Interest, Debt/Equity
- Phân loại credit profile: Investment Grade / BB / High-Yield / Speculative — kèm lý do
- Phân tích nguồn gốc deleveraging từng năm: từ OCF tự thân hay equity injection?
- Stress test lãi suất: nếu lãi suất tăng thêm 100bps, LNST giảm bao nhiêu tỷ? EPS còn bao nhiêu? Coverage ratio còn bao nhiêu? (Giả định X% nợ là thả nổi)

## BƯỚC 5 — CHẤT LƯỢNG DÒNG TIỀN
- Bảng OCF, CAPEX, FCF qua từng năm: OCF | CAPEX | FCF | OCF/LNST (%) | Ghi chú bất thường
- Nhận xét tỷ lệ chuyển hóa OCF/LNST: năm nào bất thường? Nguyên nhân?
- FCF organic có đủ để tự trả nợ không? Tính số năm hoàn nợ = Net Debt / FCF
- Kết luận giai đoạn vòng đời: đầu tư (CAPEX cao, FCF âm) hay thu hoạch (CAPEX thấp, FCF dương mạnh)?

## BƯỚC 6 — PHÂN TÍCH THEO QUÝ (bắt buộc nếu có dữ liệu quarterly)
- Bảng doanh thu theo quý (Q1–Q4) qua 3 năm gần nhất + YoY % + % đóng góp trong năm
- Bảng biên gộp (%) theo quý — phát hiện mùa vụ và anomaly
- Bảng YoY 4 quý gần nhất: Doanh thu YoY | LNST YoY | Biên gộp (pp thay đổi)
- Đánh giá quý mới nhất trong bối cảnh lịch sử: breakthrough hay reversion?
- Cờ đỏ: phát hiện bất thường về phải thu, tồn kho, lãi vay, chi phí tài chính đột biến

## BƯỚC 7 — PHÂN TÍCH DUPONT 3 NHÂN TỐ
ROE = Biên LNST × Vòng quay tài sản × Đòn bẩy tài chính
- Bảng DuPont đầy đủ qua từng năm:
  | | Năm1 | Năm2 | ... | Xu hướng |
  Net Margin (parent) | Asset Turnover | Đòn bẩy tài chính | ROE
- Phân tích đóng góp từng nhân tố: nhân tố nào cải thiện, nhân tố nào kéo ngược?
- So sánh ROE với chi phí vốn chủ sở hữu ước tính (CAPM hoặc benchmark ngành): EVA dương hay âm?
- Dự báo: ROE cần bao nhiêu năm để vượt WACC ước tính?

## BƯỚC 8 — ĐỊNH GIÁ & 3 KỊCH BẢN
- Bảng định giá lịch sử: P/E | P/B | EV/EBITDA | P/Cash Flow — qua từng năm
- Nhận định: thị trường đang chiết khấu rủi ro gì vào giá hiện tại?
- Bảng 3 kịch bản cho năm tới (Thận trọng / Cơ sở / Tích cực):
  | | Thận trọng | Cơ sở | Tích cực |
  Revenue giả định | Biên gộp | LNST (parent) | EPS forward | P/E target | Target price | Upside/Downside
- Giả định rõ ràng cho từng kịch bản về: tăng trưởng doanh thu, biên lợi nhuận, lãi suất, tăng vốn

## BƯỚC 9 — RỦI RO HỆ THỐNG & ĐẶC THÙ
Bảng 5 rủi ro hàng đầu:
| # | Rủi ro | Xác suất | Mức độ tác động | Early Warning Indicator |
Mỗi rủi ro phải có mô tả cơ chế tác động cụ thể (không nói chung chung) và chỉ số dẫn đầu (leading indicator) cụ thể để theo dõi.

━━━━━━━━━━━━━━━━━━━━━━━━━━
PHẦN KẾT — EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━
Viết 1 đoạn tóm tắt (~200 từ) bao gồm: luận điểm đầu tư cốt lõi, rủi ro lớn nhất, định giá hiện tại so với value, và khuyến nghị định tính (không phải "mua/bán" mà là "đang ở giai đoạn nào trong vòng đời đầu tư").

Kết thúc bằng:
> **Disclaimer:** Phân tích này được tạo bởi AI dựa hoàn toàn trên dữ liệu tài chính được cung cấp. Không cấu thành khuyến nghị đầu tư chính thức.`;


// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Parse: ticker positional arg + optional --output <path> flag
  let outputPath = null;
  let ticker = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[++i];
    } else if (!ticker) {
      ticker = args[i].toUpperCase();
    }
  }

  if (!ticker) {
    console.error('Usage: node scripts/analyze.js <ticker> [--output <outputFile>]');
    process.exit(1);
  }

  const inputPaths = [
    join(OUTPUT_DIR, `${ticker}_yearly.json`),
    join(OUTPUT_DIR, `${ticker}_quarterly.json`),
  ];

  if (!outputPath) outputPath = join(OUTPUT_DIR, `${ticker}_analysis.txt`);

  // Read all input files that exist
  const stocks = [];
  for (const inputPath of inputPaths) {
    log(`Reading: ${inputPath}`);
    try {
      const raw = await readFile(inputPath, 'utf8');
      stocks.push({ path: inputPath, data: JSON.parse(raw) });
    } catch (err) {
      if (err.code === 'ENOENT') {
        log(`File not found, skipping: ${inputPath}`);
      } else {
        console.error(`Failed to read/parse input file: ${err.message}`);
        process.exit(1);
      }
    }
  }

  if (stocks.length === 0) {
    console.error(`No data files found for ticker "${ticker}" in ${OUTPUT_DIR}`);
    process.exit(1);
  }
  log(`Analysing ${ticker} with AI model...`);

  // Build prompt data — include raw JSON for each file, labelled by period
  const promptData = stocks.map(({ path, data }) => {
    const label = data.period || basename(path, extname(path));
    return `# Dữ liệu ${label.toUpperCase()}\n\n${JSON.stringify(data, null, 2)}`;
  }).join('\n\n---\n\n');

  const prompt = `Phân tích doanh nghiệp này, không đứng trên góc nhìn của nhà đầu tư nhỏ lẻ lướt sóng, hãy dựa vào những phân tích mang tính chuyên môn cao và đầu tư lâu dài >1 năm.\n\nDữ liệu tài chính của ${ticker}:\n\n${promptData}`;

  // console.log('Prompt built, sending to AI service...', prompt.length);
  // console.log(prompt.slice(0, 10000) + '...'); // log first 1000 chars of prompt for sanity check
  // return;


  let responseText;
  try {
    responseText = await generate(prompt, SYSTEM_INSTRUCTION);
  } catch (err) {
    console.error(`AI generation failed: ${err.message}`);
    process.exit(1);
  }

  // Ensure output path ends with .txt
  if (!outputPath.endsWith('.txt')) outputPath += '.txt';

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, responseText, 'utf8');
  log(`Analysis saved to: ${outputPath}`);
}

main();
