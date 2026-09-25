import z from "zod";

//

const ReportFormat = ["csv", "xlsx"] as const
const ReportOrder = ["asc", "desc"] as const
const ReportLimit = [25, 50, 100, 250, 500] as const

const ReportFilterSchema = z.object({
    alpha: z.date().nullish(),
    omega: z.date().nullish(),
})

const ReportQuerySchema = z.object({
    alpha: z.date().optional(),
    omega: z.date().optional(),
    limit: z.coerce.number().int().min(1).max(500),
    offset: z.coerce.number().int().min(0),
    order: z.enum(ReportOrder),
})

const ReportExportSchema = ReportFilterSchema
    .extend({
        format: z.enum(ReportFormat),
        order: z.enum(ReportOrder),
        limit: z.coerce.number().int().min(1).max(500),
        page: z.coerce.number({ invalid_type_error: "Page is required." }).int().min(1, "Page must be at least 1."),
    })
    .refine(
        ({ alpha, omega }) => !alpha || !omega || alpha.getTime() <= omega.getTime(),
        { path: ["omega"], message: "End date must not be before the start date." }
    )

//

type ReportFormat = (typeof ReportFormat)[number]
type ReportOrder = (typeof ReportOrder)[number]
type ReportLimit = (typeof ReportLimit)[number]
type ReportFilterSchema = z.infer<typeof ReportFilterSchema>
type ReportQuerySchema = z.infer<typeof ReportQuerySchema>
type ReportExportSchema = z.infer<typeof ReportExportSchema>

//

export { ReportFormat, ReportOrder, ReportLimit, ReportFilterSchema, ReportQuerySchema, ReportExportSchema }
