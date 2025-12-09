export default async function Forms({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
 
  return (
    <div>
      <p>Form: {slug}</p>
    </div>
  )
}