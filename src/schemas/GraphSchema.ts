type GraphPeriod = "today" | "week" | "month" | "year"

//

type GraphQuerySchema = {
    period?: GraphPeriod
    timezoneOffset?: number
}

//

export type { GraphPeriod, GraphQuerySchema }
