import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import nodemailer from 'npm:nodemailer@9.0.0';
import { handleReminderRequest } from './handler.mjs';

// Supabase injects these two server-only variables. Never use the public key here.
const database = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve((request: Request) => handleReminderRequest(request, {
  rpc: async (name: string, args?: Record<string, unknown>) => {
    const { data, error } = await database.rpc(name, args);
    if (error) throw new Error('Database operation failed');
    return data;
  },
  sendMail: async (credentials: { username: string; password: string }, mail: Record<string, unknown>) => {
    const transport = nodemailer.createTransport({
      host: 'smtp.qq.com', port: 465, secure: true,
      auth: { user: credentials.username, pass: credentials.password },
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      pool: false, logger: false, debug: false,
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    try {
      await transport.sendMail({ ...mail, from: { name: '日程 · Xidong', address: credentials.username } });
    } finally { transport.close(); }
  },
}));
