import type { ReadingSchema } from "@/schemas/ReadingSchema"
import type { ReportFormat } from "@/schemas/ReportSchema"
import { Chart } from "chart.js/auto"
import { jsPDF } from "jspdf"
import Papa from "papaparse"

//

type ReportRow = Record<string, string | number | Date>

const reportMimes: Record<ReportFormat, string> = {
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

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

	const generatePDF = (period: string, sections: { title: string, readings: Pick<ReadingSchema, "createdAt" | "value" | "unit">[] }[]) => {
		const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" })
		pdf.setProperties({ title: "SGB Monitoring Report" })

		const margin = 36
		const pageWidth = pdf.internal.pageSize.getWidth()
		const pageHeight = pdf.internal.pageSize.getHeight()
		const width = pageWidth - margin * 2
		const sectionHeight = 127

		// --- Report heading
		pdf.setFont("helvetica", "bold").setFontSize(22).setTextColor(25)
		pdf.text("SGB Monitoring Report", margin, 55)
		pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(65)
		const periodLines: string[] = pdf.splitTextToSize(period, width)
		pdf.text(periodLines, margin, 74)

		// --- Charts
		let top = 87 + periodLines.length * 12
		const tickFormat = new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		})

		for (const { title, readings } of sections) {
			if (top + sectionHeight > pageHeight - margin) {
				pdf.addPage()
				top = margin
			}

			pdf.setDrawColor(205).setLineWidth(0.5).line(margin, top, pageWidth - margin, top)
			pdf.setFont("helvetica", "bold").setFontSize(12).setTextColor(25)
			const unit = readings[0]?.unit
			pdf.text(unit ? `${title} (${unit})` : title, margin, top + 16)

			if (readings.length) {
				const canvas = document.createElement("canvas")
				canvas.width = width * 2
				canvas.height = 200

				const data = readings
					.map(reading => ({ x: reading.createdAt.getTime(), y: reading.value }))
					.sort((a, b) => a.x - b.x)
				const chart = new Chart(canvas, {
					type: "line",
					data: { datasets: [{ data, borderColor: "#275943", borderWidth: 3, pointRadius: data.length === 1 ? 5 : 0 }] },
					options: {
						responsive: false,
						animation: false,
						devicePixelRatio: 2,
						plugins: { legend: { display: false } },
						scales: {
							x: {
								type: "linear",
								bounds: "data",
								grid: { display: false },
								ticks: {
									color: "#333",
									font: { size: 18 },
									maxRotation: 0,
									maxTicksLimit: 5,
									callback: value => tickFormat.format(Number(value)),
								},
							},
							y: { ticks: { color: "#333", font: { size: 18 }, maxTicksLimit: 5 } },
						},
					},
				})

				try {
					pdf.addImage(chart.toBase64Image(), "PNG", margin, top + 21, width, 100, undefined, "FAST")
				} finally {
					chart.destroy()
				}
			} else {
				pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(65)
				pdf.text("No readings available.", margin, top + 36)
			}

			top += sectionHeight
		}

		return pdf
	}


	//

	return { generateCsv, generateXlsx, generateReport, generatePDF }
}

//

export type { ReportRow }
