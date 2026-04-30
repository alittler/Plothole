'use client';
import { Keystatic } from '@keystatic/core/ui';
import config from '../../../keystatic.config';

export default function KeystaticPage() {
  return <Keystatic config={config} />;
}
