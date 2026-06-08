const fs = require('fs');
const https = require('https');
const FormData = require('form-data');

const CLOUD_NAME = 'dyihk6tei';
const UPLOAD_PRESET = 'f5171sln';

const data = fs.readFileSync('data.ts', 'utf8');

// base64 이미지 추출
const regex = /"(data:image\/[^;]+;base64,[^"]+)"/g;
let match;
const matches = [];
while ((match = regex.exec(data)) !== null) {
  matches.push({ full: match[0], base64: match[1], index: match.index });
}

console.log(`총 ${matches.length}개 base64 이미지 발견`);

async function uploadToCloudinary(base64Data, index) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'portfolio');

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: formData.getHeaders(),
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.secure_url) {
            console.log(`✅ [${index + 1}/${matches.length}] 업로드 완료: ${json.secure_url}`);
            resolve(json.secure_url);
          } else {
            console.error(`❌ [${index + 1}] 실패:`, json);
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    formData.pipe(req);
  });
}

async function main() {
  let result = data;

  for (let i = 0; i < matches.length; i++) {
    const { base64 } = matches[i];
    const url = await uploadToCloudinary(base64, i);
    if (url) {
      result = result.replace(`"${base64}"`, `"${url}"`);
    }
    // 과부하 방지
    await new Promise(r => setTimeout(r, 300));
  }

  fs.writeFileSync('data.ts', result, 'utf8');
  console.log('\n🎉 완료! data.ts 업데이트됨');
}

main().catch(console.error);
