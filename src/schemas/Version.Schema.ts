import z from "zod";

//

const VersionSchema = z.object({
    url: z.string().url(),
    version: z.string(),
    changes: z.array(z.string()),
    required: z.coerce.boolean(),
})

//

type VersionSchema = z.infer<typeof VersionSchema>

//

export { VersionSchema }
