import type { ReadingSchema } from "@/schemas/ReadingSchema"
import type { ReportFormat } from "@/schemas/ReportSchema"
import { Chart } from "chart.js/auto"
import { jsPDF } from "jspdf"
import Papa from "papaparse"

//

type ReportRow = Record<string, string | number | Date>
type ReportReading = Pick<ReadingSchema, "createdAt" | "value" | "unit">
type ReportSection = { title: string, readings: ReportReading[] }

const reportMimes: Record<ReportFormat, string> = {
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

// --- PDF positions and sizes are in points on a letter page
const pdfLayout = {
    margin: 36,
    titleY: 55,
    periodY: 74,
    sectionsY: 87,
    lineHeight: 12,
    sectionHeight: 127,
    sectionTitleY: 16,
    sectionEmptyY: 36,
    chartY: 21,
    chartHeight: 100,
    chartScale: 2,
    chartFontSize: 18,
    chartTextColor: "#333",
} as const

const pdfTickFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
})

const halfDay = 12 * 60 * 60 * 1000

//

export default () => {

    //

    const generateCsv = async (json: Object[]) => {
        return Papa.unparse(json)
    }

    const formatDateTime = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, "0")
        const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    const toBase64 = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer)
        let binary = ""
        // --- Chunked so large sheets don't overflow the call stack
        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        }
        return btoa(binary)
    }

    const generateXlsx = async (rows: ReportRow[], sheetName: string) => {
        const ExcelJS = (await import("exceljs")).default
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] })

        // --- Columns follow the keys of the first row
        const sample = rows[0] ?? {}
        sheet.columns = Object.entries(sample).map(([key, value]) => ({
            key,
            header: key,
            width: value instanceof Date ? 20 : Math.max(12, key.length + 4),
            ...(value instanceof Date && { style: { numFmt: "yyyy-mm-dd hh:mm:ss" } }),
        }))
        sheet.getRow(1).font = { bold: true }

        // --- Excel has no timezone, so shift dates to show the local wall-clock time
        const toCell = (value: ReportRow[string]) =>
            value instanceof Date ? new Date(value.getTime() - value.getTimezoneOffset() * 60000) : value
        sheet.addRows(rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, toCell(v)]))))

        return await workbook.xlsx.writeBuffer() as ArrayBuffer
    }

    const generateReport = async (rows: ReportRow[], format: ReportFormat, sheetName: string) => {
        const mime = reportMimes[format]

        if (format == "xlsx") {
            const buffer = await generateXlsx(rows, sheetName)
            return { base64: toBase64(buffer), mime, extension: format }
        }

        const serialized = rows.map(row => Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, v instanceof Date ? formatDateTime(v) : v])
        ))
        const csv = await generateCsv(serialized)
        return { base64: btoa(unescape(encodeURIComponent(csv))), mime, extension: format }
    }

    // --- PDF

    // --- Lets the browser repaint (e.g. a loading button) between heavy chart renders
    const yieldToUi = () => new Promise(resolve => setTimeout(resolve))

    const renderChartImage = (readings: ReportReading[], width: number, color?: string) => {
        const canvas = document.createElement("canvas")
        canvas.width = width * pdfLayout.chartScale
        canvas.height = pdfLayout.chartHeight * pdfLayout.chartScale

        const data = readings.map(reading => ({ x: reading.createdAt.getTime(), y: reading.value }))
        const first = data[0]!.x
        const last = data[data.length - 1]!.x
        // --- A single timestamp would otherwise repeat the same tick label
        const padding = first == last ? halfDay : 0
        const ticks = { color: pdfLayout.chartTextColor, font: { size: pdfLayout.chartFontSize }, maxTicksLimit: 5 }

        const chart = new Chart(canvas, {
            type: "line",
            data: { datasets: [{ data, borderColor: color, borderWidth: 3, pointRadius: data.length == 1 ? 5 : 0 }] },
            options: {
                responsive: false,
                animation: false,
                devicePixelRatio: pdfLayout.chartScale,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        type: "linear",
                        min: first - padding,
                        max: last + padding,
                        grid: { display: false },
                        ticks: { ...ticks, maxRotation: 0, callback: value => pdfTickFormat.format(Number(value)) },
                    },
                    y: { ticks },
                },
            },
        })

        try {
            return chart.toBase64Image()
        } finally {
            chart.destroy()
        }
    }

    const drawHeading = (pdf: jsPDF, period: string, width: number) => {
        const { margin, titleY, periodY, sectionsY, lineHeight } = pdfLayout

        pdf.setFont("helvetica", "bold").setFontSize(22).setTextColor(25)
        pdf.text("SGB Monitoring Report", margin, titleY)

        pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(65)
        const periodLines: string[] = pdf.splitTextToSize(period, width)
        pdf.text(periodLines, margin, periodY)

        return sectionsY + periodLines.length * lineHeight
    }

    const drawSection = (pdf: jsPDF, section: ReportSection, top: number, width: number, color?: string) => {
        const { margin, sectionTitleY, sectionEmptyY, chartY, chartHeight } = pdfLayout
        const unit = section.readings[0]?.unit

        pdf.setDrawColor(205).setLineWidth(0.5).line(margin, top, margin + width, top)
        pdf.setFont("helvetica", "bold").setFontSize(12).setTextColor(25)
        pdf.text(unit ? `${section.title} (${unit})` : section.title, margin, top + sectionTitleY)

        if (!section.readings.length) {
            pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(65)
            pdf.text("No readings available.", margin, top + sectionEmptyY)
            return
        }

        const image = renderChartImage(section.readings, width, color)
        pdf.addImage(image, "PNG", margin, top + chartY, width, chartHeight, undefined, "FAST")
    }

    // --- Sections are drawn in the given order, with readings expected sorted by time
    const generatePDF = async (period: string, sections: ReportSection[], color?: string) => {
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" })
        pdf.setProperties({ title: "SGB Monitoring Report" })

        const { margin, sectionHeight } = pdfLayout
        const width = pdf.internal.pageSize.getWidth() - margin * 2
        const bottom = pdf.internal.pageSize.getHeight() - margin
        let top = drawHeading(pdf, period, width)

        for (const section of sections) {
            if (top + sectionHeight > bottom) {
                pdf.addPage()
                top = margin
            }

            await yieldToUi()
            drawSection(pdf, section, top, width, color)
            top += sectionHeight
        }

        return pdf
    }

    //

    return { generateCsv, generateXlsx, generateReport, generatePDF }
}

//

export type { ReportRow, ReportReading, ReportSection }
