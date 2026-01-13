const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const p12Path = process.argv[2];
const password = process.argv[3] || '';

if (!p12Path) {
    console.error('Uso: node convert_p12.js <caminho_do_p12> [senha]');
    process.exit(1);
}

try {
    const p12File = fs.readFileSync(p12Path);
    const p12Base64 = p12File.toString('base64');
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromP12Asn1(p12Asn1, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    const cert = certBags[forge.pki.oids.certBag][0].cert;
    const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

    const certPem = forge.pki.certificateToPem(cert);
    const keyPem = forge.pki.privateKeyToPem(key);

    console.log('--- CERTIFICADO PEM ---');
    console.log(certPem);
    console.log('--- CHAVE PRIVADA PEM ---');
    console.log(keyPem);

} catch (e) {
    console.error('Erro ao converter:', e.message);
}
