import { WsEventSchema, type WsEventHandler, type WsEventOptions, type WsEventQuery } from "@/schemas/WsEventSchema"
import { reactive, ref } from "vue"

//

export default () => {

    //

    const connected = ref(false)
    const websocket = ref<WebSocket>()
    const subscribers = reactive<WsEventOptions<any>[]>([])

    //

    const connect = (url: string) => {
        websocket.value = new WebSocket(url)
        websocket.value.onopen = e => connected.value = true
        websocket.value.onclose = e => connected.value = false
        websocket.value.onmessage = onMessage
    }

    const message = <T = any>(name: string, data: T[], query: WsEventQuery) => {
        if (!websocket.value || !connected.value) return
        websocket.value.send(JSON.stringify({ name, data, query }))
    }

    const disconnect = () => {
        if (!websocket.value) return
        // --- A late close event must not mark a newer socket as disconnected
        websocket.value.onclose = null
        websocket.value.onmessage = null
        websocket.value.close()
        websocket.value = undefined
        connected.value = false
    }

    const subscribe = <T extends object = object>(name: string, query: WsEventQuery, handler: WsEventHandler<T>) => {
        subscribers.push({ name, query, handler })
    }

    const unsubscribe = <T extends object = object>(handler: WsEventHandler<T>) => {
        const index = subscribers.findIndex(s => s.handler == handler)
        if (index != -1) subscribers.splice(index, 1)
    }
    
    //

    const onMessage = (e: MessageEvent<string>) => {
        const data = JSON.parse(e.data)
        const { data: event, success } = WsEventSchema.safeParse(data)
        if (!success) return

        subscribers
            .filter(s => s.name == event.name && s.query == event.query)
            .map(s => s.handler)
            .forEach(h => h(event.data))
    }

    //

    return {
        connected,
        websocket,
        subscribers,
        connect,
        message,
        disconnect,
        subscribe,
        unsubscribe,
    }
}