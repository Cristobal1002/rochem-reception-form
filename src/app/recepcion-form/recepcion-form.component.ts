// recepcion-form.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-recepcion-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './recepcion-form.component.html',
})
export class RecepcionFormComponent {
  form = {
    guia: '',
    ordenCompra: '',
    factura: '',
    proveedor: '',
    cliente: '',
    fecha: '',
    ingreso: true,
    devolucion: false,
    productos: [
      {
        numeroParte: '',
        nombre: '',
        cantidad: '',
        vencimiento: '',
        lote: '',
        tamanoMuestra: '',
        pl: false,
        f: false,
        di: false,
        ca: false,
        empaque: {
          bueno: false,
          humedo: false,
          roto: false,
          temp: '',
        },
        estadoCalidad: '',
        bodega: '',
        compartimiento: '',
      }
    ],
    observaciones: ''
  };

  addProducto() {
    this.form.productos.push({
      numeroParte: '',
      nombre: '',
      cantidad: '',
      vencimiento: '',
      lote: '',
      tamanoMuestra: '',
      pl: false,
      f: false,
      di: false,
      ca: false,
      empaque: {
        bueno: false,
        humedo: false,
        roto: false,
        temp: '',
      },
      estadoCalidad: '',
      bodega: '',
      compartimiento: '',
    });
  }
  
  removeProducto(index: number) {
    if (confirm('¿Deseas eliminar este producto?')) {
      this.form.productos.splice(index, 1);
    }
  }
  
  
  
}
