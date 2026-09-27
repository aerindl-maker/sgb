import z from "zod"

//

// --- Data recorded before multi-esp support belongs to this esp
const DEFAULT_ESP_ID = 1

//

const EspSchema = z.object({
    id: z.coerce.number().int(),
    name: z.string().min(1),
    enabled: z.coerce.boolean(),
    online: z.coerce.boolean().default(false),
    lastSeenAt: z.coerce.date().nullish(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

// --- Only returned once, right after creating or regenerating
const EspWithKeySchema = EspSchema.extend({ key: z.string().min(1) })

const EspCreateSchema = z.object({ name: z.string().trim().min(1, "Name is required.").max(64) })
const EspUpdateSchema = EspSchema.pick({ name: true, enabled: true }).partial()

//

type EspSchema = z.infer<typeof EspSchema>
type EspWithKeySchema = z.infer<typeof EspWithKeySchema>
type EspCreateSchema = z.infer<typeof EspCreateSchema>
type EspUpdateSchema = z.infer<typeof EspUpdateSchema>

//

export { DEFAULT_ESP_ID, EspSchema, EspWithKeySchema, EspCreateSchema, EspUpdateSchema }
