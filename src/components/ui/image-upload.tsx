
"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Upload, X, Image as ImageIcon, RotateCcw, Check } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string) => void
    onRemove: () => void
    folder: "user" | "document"
    className?: string
}

export function ImageUpload({ value, onChange, onRemove, folder, className = "" }: ImageUploadProps) {
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isMobile, setIsMobile] = useState(false)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }, [])

    const handleCameraClick = () => {
        if (isMobile) {
            cameraInputRef.current?.click()
        } else {
            setIsCameraOpen(true)
        }
    }

    // Iniciar câmera
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" } // Preferencia pela câmera traseira no mobile
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err)
            alert("Não foi possível acessar a câmera. Verifique as permissões.")
            setIsCameraOpen(false)
        }
    }

    // Parar câmera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }

    // Capturar foto
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current

            // Configurar dimensões do canvas iguais ao vídeo
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            // Desenhar frame atual no canvas
            const context = canvas.getContext("2d")
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                // Converter para blob e fazer upload
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
                        await handleUpload(file)
                        setIsCameraOpen(false) // Fechar modal após captura
                    }
                }, "image/jpeg", 0.8)
            }
        }
    }

    useEffect(() => {
        if (isCameraOpen) {
            startCamera()
        } else {
            stopCamera()
        }
        return () => stopCamera()
    }, [isCameraOpen])

    // Upload arquivo
    const handleUpload = async (file: File) => {
        // Validar tamanho do arquivo (2MB = 2,097,152 bytes)
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_FILE_SIZE) {
            alert("O arquivo excede o tamanho máximo permitido de 2MB. Por favor, selecione um arquivo menor.");
            return;
        }

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", folder)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Falha no upload")
            }

            const data = await res.json()
            onChange(data.url)
        } catch (error) {
            console.error(error)
            const errorMessage = error instanceof Error ? error.message : "Erro ao fazer upload da imagem"
            alert(errorMessage)
        } finally {
            setIsUploading(false)
        }
    }

    const getFileName = (url: string) => {
        if (!url) return "imagem-download";
        try {
            return url.split('/').pop() || "imagem-download";
        } catch (e) {
            return "imagem-download";
        }
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                {value ? (
                    <div className="flex flex-col gap-2">
                        <div className="relative w-40 h-40 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                            <img
                                src={value}
                                alt="Upload preview"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex gap-1 justify-center w-40">
                            <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                                download={getFileName(value)}
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-8 px-2"
                                    type="button"
                                    title="Baixar Imagem"
                                >
                                    <Upload className="h-4 w-4 rotate-180" />
                                </Button>
                            </a>

                            {/* Visualizar em nova aba (sem download forçado) */}
                            <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-8 px-2"
                                    type="button"
                                    title="Visualizar em nova aba"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                            </a>

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={onRemove}
                                type="button"
                                className="flex-1 h-8 px-2"
                                title="Excluir Imagem"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="w-40 h-40 rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <ImageIcon className="h-8 w-8 mb-2" />
                        <span className="text-xs text-center px-2">Nenhuma imagem selecionada</span>
                    </div>
                )}

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUpload(file)
                        }}
                    />

                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUpload(file)
                        }}
                    />

                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        type="button"
                        className="w-full sm:w-auto justify-center"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? "Enviando..." : "Buscar Arquivo"}
                    </Button>

                    <Button
                        variant="outline"
                        type="button"
                        disabled={isUploading}
                        onClick={handleCameraClick}
                        className="w-full sm:w-auto justify-center"
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        Tirar Foto
                    </Button>

                    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                        <DialogContent className="sm:max-w-md">
                            <div className="flex flex-col items-center space-y-4">
                                <DialogHeader>
                                    <DialogTitle>Tirar Foto</DialogTitle>
                                </DialogHeader>
                                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                <div className="flex justify-center w-full">
                                    <Button onClick={capturePhoto} size="lg" className="rounded-full h-12 w-12 p-0 bg-white border-4 border-blue-500 hover:bg-gray-100">
                                        <div className="h-10 w-10 bg-blue-500 rounded-full border-2 border-white" />
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}
