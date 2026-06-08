import { useListNotifications, useCreateNotification } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Bell, Smartphone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const notificationSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(5),
  type: z.enum(["sms", "whatsapp", "email", "internal"]),
  target: z.enum(["all-students", "all-staff", "batch", "individual"]),
  targetId: z.string().optional(),
});

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { title: "", message: "", type: "internal", target: "all-students" },
  });

  const onSubmit = (values: z.infer<typeof notificationSchema>) => {
    createNotification.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'whatsapp': return <Smartphone className="h-4 w-4 text-green-500" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Send className="mr-2 h-4 w-4" /> Send Broadcast</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Subject / Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="internal">App Notification</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="target" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="all-students">All Students</SelectItem>
                          <SelectItem value="all-staff">All Staff</SelectItem>
                          <SelectItem value="batch">Specific Batch</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createNotification.isPending}>
                  {createNotification.isPending ? "Sending..." : "Send Now"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading history...</div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No notifications sent yet.</div>
            ) : (
              notifications?.map(note => (
                <div key={note.id} className="flex gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="mt-1 p-2 bg-primary/10 rounded-full h-fit text-primary">
                    {getIcon(note.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-base">{note.title}</h4>
                      <Badge variant={note.status === 'sent' ? 'default' : 'secondary'} className="capitalize">{note.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <span className="capitalize font-medium">To: {note.target.replace('-', ' ')}</span>
                      <span>{note.createdAt ? format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a") : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}