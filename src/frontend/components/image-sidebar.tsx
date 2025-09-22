"use client"

import { useState } from "react"
import { CameraIcon, ExternalLinkIcon, DownloadIcon, ImageIcon } from "lucide-react"
import { Button } from "./ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface ImageSidebarProps {
  images: string[]
  isStreaming?: boolean
}

export function ImageSidebar({ images, isStreaming = false }: ImageSidebarProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // Filter out failed images and remove duplicates
  const validImages = Array.from(new Set(images.filter((image) => !failedImages[image])))

  if (validImages.length === 0) {
    return (
      <div className="w-80 border-l border-border bg-background/50 backdrop-blur-sm">
        <div className="sticky top-0 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Images</h2>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm text-center">No images yet</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-border bg-background/50 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="sticky top-0 p-4 border-b border-border bg-background/80 backdrop-blur-sm z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-sm">Images</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {validImages.length}
            </span>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-indigo-500">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Images Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {validImages.map((image, index) => (
            <motion.div
              key={image}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border shadow-sm bg-muted">
                <img
                  src={image}
                  alt={`Search result ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={() => {
                    setFailedImages((prev) => ({
                      ...prev,
                      [image]: true,
                    }))
                  }}
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                      onClick={() => setExpandedImage(image)}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                      onClick={() => window.open(image, '_blank')}
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Image number badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                {index + 1}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={expandedImage}
                alt="Expanded view"
                className="w-full h-full object-contain rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => setExpandedImage(null)}
              >
                ✕
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 left-4 bg-white/90 hover:bg-white"
                onClick={() => window.open(expandedImage, '_blank')}
              >
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                Open Original
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 