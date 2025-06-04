/* eslint-disable no-undef */
'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageModal } from '@/components/ui/image-modal';
import { CldImage } from 'next-cloudinary';
import { SESSION_KEY } from '@/lib/constants';

interface TravelCard {
  id: number;
  title: string;
  imageUrl: string;
  author: string;
}

const travelCards: TravelCard[] = [
  {
    id: 1,
    title: 'Santorini, Greece',
    imageUrl: 'santorini_keamhc',
    author: 'Edsel Serrano',
  },
  {
    id: 2,
    title: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1000',
    author: 'Edsel Serrano',
  },
  {
    id: 3,
    title: 'Machu Picchu, Peru',
    imageUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1000',
    author: 'Edsel Serrano',
  },
];

export default function Home() {
  const [hasSession, setHasSession] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TravelCard | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (mounted && typeof window !== 'undefined') {
      const session = window.localStorage.getItem(SESSION_KEY);
      setHasSession(session === 'authenticated');
    }
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  if (!hasSession) {
      return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Travel Taste</h1>
            <p className="text-sm text-muted-foreground">
              Enter your password to access the dashboard
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-8">
        <p className="text-muted-foreground">Discover amazing destinations around the world</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {travelCards.map(card => (
          <Card
            key={card.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedCard(card)}
          >
            <div className="relative h-48">
              <CldImage
                src={card.imageUrl}
                alt={card.title}
                fill
                className="object-cover rounded-t-lg"
              />
            </div>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Author: {card.author}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <ImageModal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        imageUrl={selectedCard?.imageUrl || ''}
        title={selectedCard?.title || ''}
        description={`Author: ${selectedCard?.author || ''}`}
      />
    </div>
  );
}
