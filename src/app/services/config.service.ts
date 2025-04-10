import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private apiUrl: string;
  private version = 'v1';
  
  constructor(private http: HttpClient) {
    this.apiUrl = environment.apiUrl;
   }

   getApiUrl():string{
    return `${this.apiUrl}${this.version}`
   }

     // Función para armar los encabezados
  getHeaders(): HttpHeaders {
    //TODO: Depende si se requiere token para conetar a la api
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return headers;
  }
}
