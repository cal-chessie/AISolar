import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import DynamicAISalesCoach from './DynamicAISalesCoach';

interface AICoachFloatingButtonProps {
  leadId: string | null;
}

export default function AICoachFloatingButton({ leadId }: AICoachFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!leadId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-20 right-4 z-40 lg:hidden"
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg gradient-primary"
          >
            <Sparkles size={24} />
          </Button>
        </motion.div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            AI Sales Coach
          </SheetTitle>
        </SheetHeader>
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          <DynamicAISalesCoach leadId={leadId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
