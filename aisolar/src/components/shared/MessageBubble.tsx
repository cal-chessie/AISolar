/**
 * MessageBubble — the ONE renderer for a message in the centralised conversation.
 *
 * Extracted from ConsultantCockpitV5 (28 Jul) so the consultant, the installer
 * (AIField) and the customer portal all draw the SAME thread the SAME way — one
 * record per client, whoever is looking at it. The message's `sender` tags who
 * on the team spoke (consultant vs installer) inside that single thread.
 *
 * Skills: ui-ux-pro-max (family tokens, one component per purpose), stop-slop.
 */
import { motion } from 'framer-motion';
import {
  User, Sparkles, Bot, MessageSquare, FileText, CheckCircle2, Calendar,
  Award, ArrowRight,
} from 'lucide-react';
import type { ChatMessage } from '@/lib/conversation';

export default function MessageBubble({ message, onAction }: { message: ChatMessage; onAction?: (data?: string) => void }) {
  if (message.type === 'system') {
    return <div className="flex justify-center"><div className="px-3 py-1 bg-muted/50 rounded-full text-[11px] text-muted-foreground text-center max-w-[85%]">{message.body}</div></div>;
  }
  const isCustomer = message.type === 'customer';
  const isAI = message.type === 'ai';
  const isAgent = message.type === 'agent';
  const bg = isCustomer ? 'bg-primary text-primary-foreground rounded-br-sm' : isAI ? 'bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-bl-sm' : isAgent ? 'bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-bl-sm' : 'bg-muted text-foreground rounded-bl-sm';
  // Company-side messages tag the actual sender so the field team reads as
  // "Installer" and the sales team as "Consultant" in the one shared thread.
  const companyLabel = message.sender === 'installer' ? 'Installer' : 'Consultant';
  const label = isCustomer ? 'Customer' : isAI ? 'AI Assistant' : isAgent ? 'AI Agent' : companyLabel;
  const Icon = isCustomer ? User : isAI ? Sparkles : isAgent ? Bot : MessageSquare;
  const ActionIcon = message.actionIcon;
  const CardIcon = message.card?.ctaIcon;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCustomer ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`flex items-center gap-1 text-[11px] ${isCustomer ? 'flex-row-reverse' : ''}`}>
          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{new Date(message.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        {/* Bubble body */}
        <div className={`rounded-2xl px-4 py-2.5 ${bg}`}>
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          {/* Inline action button */}
          {message.actionLabel && ActionIcon && (
            <button
              onClick={() => onAction?.(message.actionData)}
              className={`mt-2 flex items-center gap-1 text-xs font-medium ${isCustomer ? 'text-primary-foreground/90' : 'text-primary dark:text-primary'} hover:underline`}
            >
              <ActionIcon className="h-3 w-3" />
              {message.actionLabel}
              <ArrowRight className="h-2 w-2" />
            </button>
          )}
        </div>
        {/* Rich card (proposal / contract / install / warranty) */}
        {message.card && (
          <div className={`mt-1 rounded-xl border bg-background shadow-sm overflow-hidden ${isCustomer ? 'ml-auto' : ''}`}>
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
              {message.card.kind === 'proposal' && <FileText className="h-3.5 w-3.5 text-primary" />}
              {message.card.kind === 'contract' && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              {message.card.kind === 'install' && <Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
              {message.card.kind === 'warranty' && <Award className="h-3.5 w-3.5 text-primary" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{message.card.title}</div>
                {message.card.subtitle && <div className="text-[11px] text-muted-foreground truncate">{message.card.subtitle}</div>}
              </div>
            </div>
            {message.card.rows && message.card.rows.length > 0 && (
              <div className="px-3 py-2 space-y-1">
                {message.card.rows.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onAction?.(message.card?.ctaData)}
              className="w-full px-3 py-2 text-xs font-medium text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-1 border-t"
            >
              {CardIcon && <CardIcon className="h-3 w-3" />}
              {message.card.ctaLabel}
              <ArrowRight className="h-2 w-2" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
