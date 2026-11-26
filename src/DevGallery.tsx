import { lazy, Suspense } from 'react'

const IconGallery = lazy(() => import('./IconGallery.tsx'))

export default function DevGallery() {
  return (
    <Suspense>
      <IconGallery />
    </Suspense>
  )
}
