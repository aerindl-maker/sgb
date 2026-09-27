import z from "zod";

//

const UserRole = ["Admin", "Farmer"] as const
type UserRole = (typeof UserRole)[number]

//

const UserSchema = z.object({
    id: z.coerce.number().int(),
    name: z.string().min(1),
    role: z.enum(UserRole),
    email: z.string().email(),
    phone: z.string().length(11),
    password: z.string().min(8),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

const UserSafeSchema = UserSchema.omit({ password: true })
const UserQuerySchema = UserSchema.partial()
const UserSignInSchema = UserSchema.pick({ email: true, password: true })
const UserCreateSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true })
const UserUpdateSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true }).partial()
const UserDeleteSchema = UserSchema.pick({ name: true })
const UserForgotPasswordSchema = UserSchema.pick({ email: true })
const UserResetPasswordSchema = UserSchema.pick({ email: true, password: true })
    .extend({
        code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
        confirm: z.string().min(1, "Confirm your new password."),
    })
    .refine((v) => v.password == v.confirm, { message: "Passwords do not match.", path: ["confirm"] })

//

type UserSchema = z.infer<typeof UserSchema>
type UserSafeSchema = z.infer<typeof UserSafeSchema>
type UserQuerySchema = z.infer<typeof UserQuerySchema>
type UserSignInSchema = z.infer<typeof UserSignInSchema>
type UserCreateSchema = z.infer<typeof UserCreateSchema>
type UserUpdateSchema = z.infer<typeof UserUpdateSchema>
type UserDeleteSchema = z.infer<typeof UserDeleteSchema>
type UserForgotPasswordSchema = z.infer<typeof UserForgotPasswordSchema>
type UserResetPasswordSchema = z.infer<typeof UserResetPasswordSchema>

//

export {
    UserRole,
    UserSchema,
    UserSafeSchema,
    UserQuerySchema,
    UserSignInSchema,
    UserCreateSchema,
    UserUpdateSchema,
    UserDeleteSchema,
    UserForgotPasswordSchema,
    UserResetPasswordSchema,
}
