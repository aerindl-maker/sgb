import { Camera } from "@capacitor/camera"
import { Capacitor } from "@capacitor/core"
import { ref } from "vue"

//

export default () => {
	//

	const stream = ref<MediaStream>()
	const cameras = ref<MediaDeviceInfo[]>([])
	const permitted = ref(false)

	//

	const list = async () => {
		if (!navigator.mediaDevices?.enumerateDevices) throw new Error("Camera access is not supported on this device.")
		await requestPerm()
		const devices = await navigator.mediaDevices.enumerateDevices()
		cameras.value = devices.filter(device => device.kind === "videoinput")
		return cameras.value
	}

	const begin = async (id?: string, width?: number, height?: number) => {
		if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported on this device.")
		await terminate()
		const deviceId = id || cameras.value[0]?.deviceId

		const video: MediaStreamConstraints["video"] = {
			deviceId: deviceId ? { exact: deviceId } : undefined,
			width: { ideal: width || 720 },
			height: { ideal: height || 720 },
			aspectRatio: { ideal: 1 },
		}

		stream.value = await navigator.mediaDevices.getUserMedia({ video, audio: false })
		return stream.value
	}

	const terminate = async () => {
		if (!stream.value) return
		stream.value.getTracks().forEach(track => track.stop())
		stream.value = undefined
	}

	const requestPerm = async () => {
		if (!Capacitor.isNativePlatform()) return await requestPermWeb().then(() => (permitted.value = true))
		return await requestPermNative().then(() => (permitted.value = true))
	}

	const requestPermWeb = async () => {
		return await navigator.mediaDevices
			.getUserMedia({ video: true, audio: false })
			.then(res => res.getTracks().forEach(track => track.stop()))
			.then(() => (permitted.value = true))
	}

	const requestPermNative = async () => {
		let status = await Camera.checkPermissions()
		if (status.camera == "granted") return await requestPermWeb()

		status = await Camera.requestPermissions({ permissions: ["camera"] })
		if (status.camera == "granted") return await requestPermWeb()
		throw new Error("Camera permission denied.")
	}

	//

	return {
		stream,
		cameras,
		permitted,
		list,
		begin,
		terminate,
		requestPerm,
		requestPermWeb,
		requestPermNative,
	}
}
