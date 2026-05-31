import { useListStaff } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Mail, Phone, Briefcase } from "lucide-react";

export default function Staff() {
  const [search, setSearch] = useState("");
  const { data: staff, isLoading } = useListStaff();

  const filteredStaff = staff?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Staff Directory</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Staff Member</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search staff..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name & Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading staff...</TableCell></TableRow>
                ) : filteredStaff.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No staff members found</TableCell></TableRow>
                ) : (
                  filteredStaff.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium">{member.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Briefcase className="h-3 w-3" />
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" /> {member.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" /> {member.phone}
                        </div>
                      </TableCell>
                      <TableCell>{member.subject || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}