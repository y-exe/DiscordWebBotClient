// GitOps マニフェストの restartedAt アノテーションを更新して Argo のロールアウトを誘発する。
// 使い方: node bump-rollout.mjs apps/materialcord/app.yaml
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node bump-rollout.mjs <manifest.yaml>');
  process.exit(1);
}

const stamp = new Date().toISOString();
let yaml = readFileSync(file, 'utf8');

if (yaml.includes('kubectl.kubernetes.io/restartedAt')) {
  yaml = yaml.replace(/kubectl\.kubernetes\.io\/restartedAt: '.*'/, `kubectl.kubernetes.io/restartedAt: '${stamp}'`);
} else {
  const anchor = /([ \t]+labels:\n[ \t]+app: materialcord\n)([ \t]+spec:)/;
  if (!anchor.test(yaml)) {
    console.error('insertion point not found');
    process.exit(1);
  }
  yaml = yaml.replace(anchor, `$1${' '.repeat(10)}annotations:\n${' '.repeat(12)}kubectl.kubernetes.io/restartedAt: '${stamp}'\n$2`);
}

writeFileSync(file, yaml);
console.log('restartedAt ->', stamp);
