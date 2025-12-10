import { columns, Payment } from "./columns"
import { DataTable } from "./data-table"


export default async function Forms({params}: {params: Promise<{form_id: string}>}) {
  const {form_id} = await params

  let data: Payment[] = []

  if (form_id === '1') {
    data = [
      {
        id: "728ed52f",
        amount: 100,
        status: "pending",
        email: "m@example.com",
      },
      {
        id: "829ed53g",
        amount: 200,
        status: "success",
        email: "n@example.com",
      },
      {
        id: "930ed54h",
        amount: 150,
        status: "failed",
        email: "o@example.com",
      },
    ]
  } else if (form_id === '2') {
    data = [
      {
        id: "031ed55i",
        amount: 250,
        status: "processing",
        email: "p@example.com",
      },
    ]
  }

  return (
    <div className="block px-8 py-4 min-h-screen justify-center bg-background font-sans dark:bg-black">
      <DataTable columns={columns} data={data} form_id={form_id} />
    </div>
  )
}