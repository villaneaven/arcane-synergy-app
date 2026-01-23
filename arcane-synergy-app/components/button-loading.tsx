import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function ButtonLoading() {
  return (
    <Button variant="outline" disabled>
      <Spinner />
      Deleting
    </Button>
  )
}
