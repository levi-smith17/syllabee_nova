import { useParams } from 'react-router-dom'

export default function SyllabusViewerPage() {
  const { courseCode, termCode, sectionCode } = useParams()

  return (
    <div className="p-6">
      <p className="text-muted-foreground text-sm">
        {courseCode?.toUpperCase()} · {termCode?.toUpperCase()} · {sectionCode?.toUpperCase()}
      </p>
    </div>
  )
}
