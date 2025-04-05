'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  description: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, title, description }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] z-[200] [&>div]:z-[180]">
        <div className="relative aspect-video w-full">
          <Image src={imageUrl} alt={title} fill className="object-cover rounded-lg" />
        </div>
        <div className="mt-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
