# Guia de Configuração SSL Certbot & Renovação Automática — GIRO Angola

Este guia descreve o processo de emissão de certificados SSL gratuitos e seguros da **Let's Encrypt** para a infraestrutura do GIRO Angola.

---

## 1. Emissão do Certificado SSL

Com o domínio apontado no DNS (A Record para o IP da VPS):

```bash
# 1. Teste de simulação (Dry Run)
sudo certbot certonly --nginx --dry-run -d api.giro.ao -d giro.ao

# 2. Emissão do certificado oficial
sudo certbot --nginx -d api.giro.ao -d giro.ao --email admin@giro.ao --agree-tos --no-eff-email
```

---

## 2. Teste de Renovação Automática

O Certbot instala automaticamente um temporizador systemd. Verifique o status:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 3. Ativação do Nginx

```bash
sudo ln -sf /root/giro-angola/backend/nginx_giro.conf /etc/nginx/sites-available/giro.conf
sudo ln -sf /etc/nginx/sites-available/giro.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
