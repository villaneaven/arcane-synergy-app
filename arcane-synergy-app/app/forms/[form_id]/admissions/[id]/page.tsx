import { columns, Payment } from "../../columns"
import { SubDataTable } from "./sub-data-table"


export default async function Form({params}: {params: Promise<{id: string}>}) {
  const {id} = await params

  let data: Payment[] = []

  if (id === '728ed52f') {
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
      <SubDataTable columns={columns} data={data} />
    </div>
  )
}