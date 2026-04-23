# Incident Response Runbook

## Health checks

### Backend
```bash
curl http://localhost:5001/health
# Expected: {"status":"OK"}
```

### Services (Docker)
```bash
docker-compose ps
# All services should be "Up"
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f dc-power-flow
docker-compose logs -f vessel-modelling
docker-compose logs -f pv-model
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## Common issues

### Backend won't start

1. **MongoDB connection failed**  
   - Check `MONGODB_URI` is correct and MongoDB is running  
   - `docker-compose logs backend` for error details  

2. **PostgreSQL connection failed**  
   - Check `POSTGRES_*` env vars  
   - Ensure PostgreSQL is running and reachable  
   - Verify `init.sql` has been run  

3. **Port 5001 already in use**  
   - Stop conflicting process or change `PORT`  

### Frontend shows blank or API errors

1. **CORS / wrong backend URL**  
   - Confirm `NEXT_PUBLIC_BACKEND_URL` matches actual backend URL  
   - Frontend is built with this at build time – rebuild if changed  

2. **Backend not reachable**  
   - Check backend health endpoint  
   - Check nginx config if behind reverse proxy  

### Python services failing

1. **DC Power Flow (5002)**  
   - Check `dc_power_flow/logs`  
   - Ensure input data files exist in `dc_power_flow/data`  
   - Verify `run_simulation.sh` has execute permission  

2. **Vessel Modelling (5003)**  
   - Check `vessel_modelling/logs`  
   - Ensure `vessel_modelling/Data` exists  

3. **PV Model (5004)**  
   - Check `pv_model/logs`  

### Real-time data not updating

1. **Socket.IO connection**  
   - Frontend uses `NEXT_PUBLIC_BACKEND_URL` for Socket.IO  
   - Ensure no firewall/proxy blocking WebSocket  

2. **MongoDB device data**  
   - Backend polls MongoDB every 30s for device data  
   - Check `dataMonitorService` logs  

### SSL / HTTPS issues

1. **Certificate expired**  
   ```bash
   ./renew-ssl.sh
   docker-compose restart nginx
   ```

2. **Mixed content**  
   - Ensure all API URLs use `https://` in production  

## Restart procedures

```bash
# Restart single service
docker-compose restart backend

# Restart all
docker-compose restart

# Full restart (down + up)
docker-compose down
docker-compose up -d
```

## Escalation

- Check `docs/ARCHITECTURE.md` for service dependencies  
- Check `docs/ENV_VARS.md` for required configuration  
- Database issues: see `docs/runbooks/DATABASE_MAINTENANCE.md`  
