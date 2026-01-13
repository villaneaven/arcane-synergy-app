"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

export function NewPatientDialog() {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    new Date("1990-01-01T00:00:00"),
  )
  const [month, setMonth] = React.useState<Date | undefined>(date)
  const [value, setValue] = React.useState(formatDate(date))

  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button>Add Patient</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-106">
          <DialogHeader>
            <DialogTitle>Add Patient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="first-name-1"> First Name</Label>
              <Input id="first-name-1" name="first-name" placeholder="John" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="last-name-1">Last Name</Label>
              <Input id="last-name-1" name="last-name" placeholder="Doe" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="date-of-birth-1">Date of Birth</Label>
              <div className="relative flex gap-2">
                <Input
                  id="date"
                  value={value}
                  placeholder="MM/DD/YYYY"
                  className="bg-background pr-10"
                  onFocus={(e) => {
                    e.currentTarget.select()
                  }}
                  onClick={(e) => {
                    e.currentTarget.select()
                  }}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    setValue(e.target.value)
                    if (isValidDate(date)) {
                      setDate(date)
                      setMonth(date)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setOpen(true)
                    }
                  }}
                />
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                      <CalendarIcon className="size-3.5" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      month={month}
                      onMonthChange={setMonth}
                      onSelect={(date) => {
                        setDate(date)
                        setValue(formatDate(date))
                        setOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="mrn-1">MRN</Label>
              <Input id="mrn-1" name="mrn" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="group-1">Group</Label>
              <Input id="group-1" name="group" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="insurance-1">Insurance</Label>
              <Input id="insurance-1" name="insurance" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="pcp-1">PCP</Label>
              <Input id="pcp-1" name="pcp" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="clinic-1">Clinic</Label>
              <Select>
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Select a clinic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Clinics</SelectLabel>
                    <SelectItem value="EM">EMC</SelectItem>
                    <SelectItem value="VFC">VFC</SelectItem>
                    <SelectItem value="RGVAIMS-WES">RGVAIMS-WES</SelectItem>
                    <SelectItem value="DMC">DMC</SelectItem>
                    <SelectItem value="RGVAIMS-MER">RGVAIMS-MER</SelectItem>
                    <SelectItem value="MVFPA">MVFPA</SelectItem>
                    <SelectItem value="MCACC">MCACC</SelectItem>
                    <SelectItem value="WMC">WMC</SelectItem>
                    <SelectItem value="KCP-HAR">KCP-HAR</SelectItem>
                    <SelectItem value="MMC">MMC</SelectItem>
                    <SelectItem value="DDNC">DDNC</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}