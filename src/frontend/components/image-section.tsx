/* eslint-disable @next/next/no-img-element */
"use client"
import { useState } from "react"
import { Skeleton } from "./ui/skeleton"

export const ImageSectionSkeleton = () => {
  return (
    <>
      <div className="my-4 grid grid-cols-1 gap-2 lg:grid-cols-2 w-full">
        {[...Array(4)].map((_, index) => (
          <div className="w-full h-full" key={`image-skeleton-${index}`}>
            <Skeleton className="rounded-md object-cover shadow-none border-none w-full bg-card h-[160px] " />
          </div>
        ))}
      </div>
    </>
  )
}

export function ImageSection({ images }: { images: string[] }) {
  // Track which images have failed to load
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  if (images && images.length > 0) {
    // Filter out images that have failed to load
    const validImages = images.filter((image) => !failedImages[image])

    if (validImages.length === 0) {
      return <div className="my-4 text-muted-foreground">No valid images available</div>
    }

    return (
      <div className="my-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {validImages.slice(0, 4).map((image) => (
          <a
            key={image}
            href={image}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-video w-full h-full overflow-hidden hover:scale-[1.03] duration-150 rounded-lg transition-all shadow-md"
          >
            <img
              src={image || "/placeholder.svg"}
              className="w-full object-cover object-top h-full max-h-[80vh]"
              alt="Search result"
              onError={() => {
                setFailedImages((prev) => ({
                  ...prev,
                  [image]: true,
                }))
              }}
            />
          </a>
        ))}
      </div>
    )
  }
  return null
}

