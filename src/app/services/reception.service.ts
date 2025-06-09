import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, throwError } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ReceptionService {

  private baseUrl: string;
  private headers: HttpHeaders;

  constructor(private http: HttpClient, private config: ConfigService, private router: Router) {
    this.baseUrl = config.getApiUrl();
    this.headers = config.getHeaders();
  }

  private handleError(error: any): Observable<never> {
    console.error('Ocurrió un error:', error);
    return throwError(() => new Error('Ocurrió un error en la solicitud'));
  }

  findOrdersByNumber(poNumber: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/receptions/orders?poNumber=${poNumber}`, { headers: this.headers })
      .pipe(catchError(this.handleError))
  }

  getOrderData(poNumber: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/receptions/get-order?poNumber=${poNumber}`, { headers: this.headers })
      .pipe(catchError(this.handleError))
  }

  guardarRecepcion(data: any): Observable < any > {
    return this.http.post<any>( `${this.baseUrl}/receptions/saveOrder`, data, { headers: this.headers }
    ).pipe(catchError(this.handleError));
  }

  buscarOrdenesCombinadas(poNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/receptions/search-combined?poNumber=${poNumber}`,
      { headers: this.headers }
    ).pipe(catchError(this.handleError));
  }
  
  getSavedReception(poNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/receptions/by-po/${poNumber}`,
      { headers: this.headers }
    ).pipe(catchError(this.handleError));
  }
}

