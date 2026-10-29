import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export function Dialog({ open, onOpenChange, title, description, children }) {
  return <Primitive.Root open={open} onOpenChange={onOpenChange}><Primitive.Portal><Primitive.Overlay className="dialog-overlay"/><Primitive.Content className="dialog-content"><Primitive.Title className="dialog-title">{title}</Primitive.Title><Primitive.Description className="muted dialog-description">{description}</Primitive.Description>{children}<Primitive.Close className="dialog-close" aria-label="Close dialog"><X size={18}/></Primitive.Close></Primitive.Content></Primitive.Portal></Primitive.Root>;
}
