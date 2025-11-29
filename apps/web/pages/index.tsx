import React from 'react';
import { SantaCanvas } from '../components/SantaCanvas';
import { FakeVisemeGenerator } from '../components/FakeVisemeGenerator';

export default function Home() {
  return (
    <>
      <SantaCanvas />
      <FakeVisemeGenerator />
    </>
  );
}
