import jsPDF from 'jspdf'
import Papa from "papaparse"
import html2canvas from 'html2canvas'
import type { ReportFormat } from '@/schemas/ReportSchema'

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

    const generatePDF = async (el: HTMLElement) => {
        // --- Create A4 report
        const pdf = new jsPDF({
            orientation: "p",
            unit: "px",
            format: "a4",
            hotfixes: ["px_scaling"],
        })

        // --- 96px = 1inch
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        // --- Create canvas of the element
        const canvas = await html2canvas(el, {
            useCORS: true,
            width: el.scrollWidth,
            height: el.scrollHeight,
        })

        // --- Convert canvas to image in ratio
        const imgData = canvas.toDataURL("image/png")
        const imgWidth = pdfWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // --- Record increments
        let heightLeft = imgHeight
        let heightUsed = 0

        // --- Slice the first part of the image
        pdf.addImage(imgData, "PNG", 0, heightUsed, imgWidth, imgHeight)
        heightLeft -= pdfHeight

        // --- Pull up the image
        while (heightLeft > 0) {
            heightUsed -= pdfHeight
            pdf.addPage()
            pdf.addImage(imgData, "PNG", 0, heightUsed, imgWidth, imgHeight)
            heightLeft -= pdfHeight
        }

        return pdf
    }

    //

    return { generateCsv, generateXlsx, generateReport, generatePDF }
}

export type { ReportRow }