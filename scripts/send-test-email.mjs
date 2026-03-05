#!/usr/bin/env node

import { spawn } from 'child_process';

const payload = JSON.stringify({
  to: 'dev@teste.com',
  subject: 'Teste Email Service',
  body: '<h1>Funcionou!</h1><p>Email enviado com sucesso pelo email-service.</p>',
  bodyText: 'Funcionou! Email enviado com sucesso.',
});

console.log('📨 Enviando mensagem de teste para o tópico send-email...');
console.log(`   Payload: ${payload}\n`);

const proc = spawn('docker', [
  'run', '--rm', '-i',
  '--network', 'email-service_default',
  'apache/kafka:3.9.0',
  '/opt/kafka/bin/kafka-console-producer.sh',
  '--broker-list', 'kafka:9092',
  '--topic', 'send-email',
], { stdio: ['pipe', 'inherit', 'inherit'] });

proc.stdin.write(payload + '\n');
proc.stdin.end();

proc.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Mensagem publicada! Verifique o smtp4dev em http://localhost:5000');
  } else {
    console.error(`\n❌ Falha ao publicar mensagem. Código de saída: ${code}`);
    process.exit(1);
  }
});
