import { columns, Patient } from "./columns"
import { DataTable } from "./data-table"


export default async function Patients() {
  const res = await fetch('http://localhost:5201/api/patients', {
    cache: 'no-store'
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch patients')
  }
  
  const data: Patient[] = await res.json()

  return (
    <div className="block px-8 py-4 min-h-screen justify-center bg-background font-sans dark:bg-black">
      <DataTable columns={columns} data={data} />
    </div>
  )
}