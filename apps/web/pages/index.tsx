import React from 'react';
import { SantaCanvas } from '../components/SantaCanvas';
import { ServerConnection } from '../components/FakeVisemeGenerator';

export default function Home() {
  return (
    <>
      <SantaCanvas />
      <ServerConnection />
    </>
  );
}
