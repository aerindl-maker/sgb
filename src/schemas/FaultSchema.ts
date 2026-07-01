import z from "zod"

//

const FaultSchema = z.object({
	id: z.coerce.number().int(),
	title: z.string().min(1),
	message: z.string().min(1),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

//

type FaultSchema = z.infer<typeof FaultSchema>

//

export { FaultSchema }
