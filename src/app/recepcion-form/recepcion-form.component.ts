import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  FormBuilder,
  FormArray,
  Validators
} from '@angular/forms';


import { debounceTime, switchMap, map, filter, catchError, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ReceptionService } from '../services/reception.service';
import { LoadingService } from '../services/loading.service';

@Component({
  standalone: true,
  selector: 'app-recepcion-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recepcion-form.component.html'
})
export class RecepcionFormComponent {
  private receptionService = inject(ReceptionService);
  private fb = inject(FormBuilder);
  private loadingService = inject(LoadingService)

  ordenControl = new FormControl('');
  ordenesFiltradas$: Observable<any[]> = of([]);
  mostrarLista = false;
  products: any[] = [];
  po: any[] = [];
  estadoCerrado = false;

  form: FormGroup = this.fb.group({
    idRecepcion: [null], // ✅ AGREGADO
    ordenCompra: ['', Validators.required],
    guia: [''],
    factura: [''],
    proveedor: [''],
    cliente: [''],
    fecha: [''],
    fechaRecibo: [this.hoy()],
    ingreso: [true],
    devolucion: [false],
    observaciones: [''],
    productos: this.fb.array([]),
    estado: ['Borrador'],
    planilla: [''],       // 🆕 Agregado
    reactivo: [false],    // 🆕 Agregado
  });

  ngOnInit() {
    this.ordenesFiltradas$ = this.ordenControl.valueChanges.pipe(
      debounceTime(300),
      filter((valor: any): valor is string => typeof valor === 'string' && valor.length >= 3),
      tap(() => this.loadingService.show('Buscando órdenes...')),
      switchMap(valor =>
        this.receptionService.buscarOrdenesCombinadas(valor)
      ),
      tap(() => this.loadingService.hide()),
      catchError(() => {
        this.loadingService.hide();
        return of([]);
      }),
      map(resp => resp?.data || [])
    );
    this.form.get('fechaRecibo')?.setValue(this.hoy());
  }


  selectedOrder(poNumber: string, source: 'ERP' | 'Guardado') {
    this.loadingService.show('Cargando orden');

    const observable = source === 'ERP'
      ? this.receptionService.getOrderData(poNumber)
      : this.receptionService.getSavedReception(poNumber);

    observable.subscribe({
      next: (response) => {
        if (!response?.data) {
          this.loadingService.hide();
          return;
        }

        if (source === 'ERP') {
          if (Array.isArray(response.data) && response.data.length > 0) {
            this.cargarOrdenDesdeERP(response.data);
          }
        } else {
          this.cargarOrdenGuardada(response.data);
        }

        this.loadingService.hide();
        this.mostrarLista = false;
      },
      error: (err) => {
        this.loadingService.hide();
        console.error('Error al cargar orden:', err);
      }
    });
  }

  createProducto(item = '', numeroParte = '', nombre = '', cantidad = ''): FormGroup {
    return this.fb.group({
      item: [item],
      numeroParte: [numeroParte],
      nombre: [nombre],
      cantidad: [cantidad],
      vencimiento: [''],
      lote: [''],
      tamanoMuestra: [''],
      etiquetaFabrica: [''],
      estadoCalidad: [''],
      bodega: [''],
      compartimiento: [''],
      pl: [false],
      f: [false],
      li: [false],
      di: [false],
      ca: [false],
      empaque: this.fb.group({
        b: [false], h: [false], r: [false], a: [false], m: [false], o: [false], temp: ['']
      })
    });
  }


  displayOrden(orden: any): string {
    return orden?.NumeroOrdenCompra?.trim() || '';
  }

  get productos(): FormArray {
    return this.form.get('productos') as FormArray;
  }


  seleccionarOrden(orden: any) {
    // Llenamos los datos del encabezado
    this.form.patchValue({
      ordenCompra: orden.NumeroOrdenCompra?.trim() || '',
      proveedor: orden.NombreProveedor?.trim() || '',
      cliente: orden.IDProveedor?.trim() || '',
      fecha: orden.FechaDocumento?.substring(0, 10) || '',
      factura: orden.NumeroRecepcionCompra?.trim() || '',
      reactivo: orden.Reactivo,
      planilla: orden.Planilla
    });

    // Limpiamos productos existentes
    this.productos.clear();

    // Si la orden es un único ítem, lo tratamos igual como array
    const productos = [orden]; // en tu caso el backend responde así

    for (const p of productos) {
      this.productos.push(this.fb.group({
        item: p.NumeroArticulo?.trim() || '',
        numeroParte: p.NumeroArticulo?.trim() || '',
        nombre: p.DescripcionArticulo?.trim() || '',
        cantidad: p.CantidadOrdenada || '',
        vencimiento: p.FechaVencimiento?.substring(0, 10) || '',
        lote: '',
        tamanoMuestra: '',
        etiquetaFabrica: '',
        estadoCalidad: '',
        bodega: '',
        compartimiento: '',
        pl: false,
        f: false,
        li: false,
        di: false,
        ca: false,
        empaque: this.fb.group({
          b: false, h: false, r: false, a: false, m: false, o: false, temp: ''
        })
      }));
    }

    // ✅ Ocultamos la lista luego de un pequeño retraso
    setTimeout(() => {
      this.mostrarLista = false;
    }, 50);
  }


  ocultarListaConRetraso() {
    setTimeout(() => {
      this.mostrarLista = false;
    }, 150); // da tiempo al click antes de cerrar
  }

  removeProducto(index: number) {
    if (confirm('¿Deseas eliminar este producto?')) {
      this.productos.removeAt(index);
    }
  }

  addProducto() {
    this.productos.push(this.createProducto());
  }


  hoy(): string {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  }

  imprimir() {
    const header = `
  <div style="display: flex; justify-content: space-between; align-items: start;">
    <div>
      <h3 style="margin-bottom: 10px;">Recepción de Productos</h3>
      <p><strong>Orden:</strong> ${this.form.value.ordenCompra}</p>
      <p><strong>Proveedor:</strong> ${this.form.value.proveedor}</p>
      <p><strong>Planilla:</strong> ${this.form.value.planilla}</p> <!-- 🆕 -->
      <p><strong>Reactivo:</strong> ${this.form.value.reactivo ? 'Sí' : 'No'}</p> <!-- 🆕 -->
      <p><strong>Factura:</strong> ${this.form.value.factura}</p>
      <p><strong>Fecha OC:</strong> ${this.form.value.fecha}</p>
      <p><strong>Fecha Recibo:</strong> ${this.form.value.fechaRecibo}</p>
    </div>
    <div>
      <img src="/images/logo_rochem.jpeg" alt="Logo" style="height: 60px;" />
    </div>
  </div>
`;
  
    const tablaHTML = this.generarTablaProductosHTML();
  
    const ventana = window.open('', '_blank', 'width=1000,height=1000');
    if (ventana) {
      ventana.document.write(`
        <html>
          <head>
            <title>Recepción de Productos</title>
            <style>
              @page {
                size: landscape;
                margin: 1cm;
              }
  
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
              }
  
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
                margin-bottom: 2rem;
              }
  
              th, td {
                border: 1px solid #ccc;
                padding: 4px;
                text-align: center;
              }
  
              h3 {
                margin-bottom: 1rem;
                font-size: 18px;
              }
  
              p {
                margin: 2px 0;
              }
  
              .firmas {
                display: flex;
                justify-content: space-between;
                margin-top: 80px;
                text-align: center;
              }
  
              .firmas div {
                width: 30%;
                border-top: 1px solid #000;
                padding-top: 4px;
                font-size: 12px;
              }
  
              .glosario {
                font-size: 10px;
                margin-top: 100px;
                border-top: 1px solid #999;
                padding-top: 10px;
                color: #333;
                page-break-inside: avoid;
                break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${header}
            ${tablaHTML}
  
            <div class="firmas">
              <div>Recepción de Productos</div>
              <div>Inspección de Productos</div>
              <div>Aprobación y Liberación por Dirección Técnica</div>
            </div>
  
            <div class="glosario">
              <strong>Documentación:</strong> Packing List (PL) - Factura (F) - Licencia de Importación (LI) - Declaración de Importación (DI) - Certificado de Análisis (CA)<br/>
              <strong>Estado de Calidad:</strong> Aprobado (150, 151) - Rechazado (982) - Concesión y/o demostración (981)<br/>
              <strong>Empaque:</strong> Bueno (B) - Húmedo (H) - Roto (R) - Abollado (A) - Manchado (M) - Otros (O)
            </div>
  
            <script>
              window.onload = function () {
                setTimeout(function () {
                  window.print();
                  window.close();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      ventana.document.close();
    }
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;

    this.loadingService.show('Guardando recepción...');

    this.receptionService.guardarRecepcion(payload).subscribe({
      next: (resp) => {
        this.loadingService.hide();
        alert('✅ Recepción guardada exitosamente.');

        // Si deseas reiniciar el formulario:
        this.form.reset();
        this.productos.clear();
        this.form.get('fechaRecibo')?.setValue(this.hoy());
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error al guardar recepción:', error);
        alert('❌ Error al guardar recepción. Revisa la consola para más detalles.');
      }
    });
  }

  private cargarOrdenDesdeERP(data: any[]) {
    const orden = data[0];

    this.form.patchValue({
      ordenCompra: orden.NumeroOrdenCompra?.trim() || '',
      proveedor: orden.NombreProveedor?.trim() || '',
      cliente: orden.IDProveedor?.trim() || '',
      fecha: orden.FechaDocumento?.substring(0, 10) || '',
      factura: orden.NumeroRecepcionCompra?.trim() || '',
      estado: 'Borrador' // por defecto
    });

    this.productos.clear();

    for (const p of data) {
      this.productos.push(this.createProducto(p.NumeroArticulo, p.NumeroArticulo, p.DescripcionArticulo, p.CantidadOrdenada));

      if (p.EsKit && p.Componentes?.length) {
        for (const c of p.Componentes) {
          this.productos.push(this.createProducto('', c.Componente, c.Descripcion, ''));
        }
      }
    }
  }

  private cargarOrdenGuardada(data: any) {
    const encabezado = data;
    const productos = data.productos || [];

    const formatDate = (value: string) => {
      if (!value) return '';
      return value.substring(0, 10);
    };

    this.form.patchValue({
      idRecepcion: encabezado.IdRecepcion || null,
      ordenCompra: encabezado.NumeroOrdenCompra?.trim() || '',
      proveedor: encabezado.Proveedor?.trim() || '',
      cliente: encabezado.IDProveedor?.trim() || '',
      fecha: this.formatFecha(encabezado.FechaOC || encabezado.FechaDocumento),
      guia: encabezado.Guia?.trim() || '',
      factura: encabezado.Factura?.trim() || '',
      fechaRecibo: this.formatFecha(encabezado.FechaRecepcion),
      ingreso: encabezado.Ingreso,
      devolucion: encabezado.Devolucion,
      observaciones: encabezado.Observaciones || '',
      estado: encabezado.Estado || 'Borrador',
      planilla: encabezado.Planilla || '',            // ✅ este faltaba
      reactivo: encabezado.Reactivo || false          // ✅ este faltaba
    });

    this.productos.clear();

    for (const p of productos) {
      this.productos.push(this.fb.group({
        item: [p.Item || ''],
        numeroParte: [p.NumeroParte || ''],
        nombre: [p.NombreProducto || ''],
        cantidad: [p.Cantidad || ''],
        vencimiento: [formatDate(p.FechaVencimiento)],
        lote: [p.Lote || ''],
        tamanoMuestra: [p.TamanoMuestra || ''],
        etiquetaFabrica: [p.EtiquetaFabrica || ''],
        estadoCalidad: [p.EstadoCalidad || ''],
        bodega: [p.Bodega || ''],
        compartimiento: [p.Compartimiento || ''],
        pl: [p.PL || false],
        f: [p.F || false],
        li: [p.LI || false],
        di: [p.DI || false],
        ca: [p.CA || false],
        empaque: this.fb.group({
          b: [p.Empaque_B || false],
          h: [p.Empaque_H || false],
          r: [p.Empaque_R || false],
          a: [p.Empaque_A || false],
          m: [p.Empaque_M || false],
          o: [p.Empaque_O || false],
          temp: [p.Empaque_Temp || '']
        })
      }));
    }

    // 🔒 Manejo de estado cerrado
    this.estadoCerrado = encabezado.Estado === 'Cerrado';

    if (this.estadoCerrado) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  private formatFecha(valor: any): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    return fecha.toISOString().substring(0, 10);
  }

  generarTablaProductosHTML(): string {
    const productos = this.productos.controls;
    if (!productos.length) return '<p>No hay productos para mostrar.</p>';

    let rows = productos.map((control, i) => {
      const value = control.value;
      return `
        <tr>
          <td>${value.item || ''}</td>
          <td>${value.numeroParte || ''}</td>
          <td>${value.nombre || ''}</td>
          <td>${value.cantidad || ''}</td>
          <td>${value.vencimiento || ''}</td>
          <td>
  <div style="display: flex; justify-content: center; gap: 6px;">
    ${value.pl ? '<span>PL</span>' : ''}
    ${value.f ? '<span>F</span>' : ''}
    ${value.li ? '<span>LI</span>' : ''}
    ${value.di ? '<span>DI</span>' : ''}
    ${value.ca ? '<span>CA</span>' : ''}
  </div>
</td>
          <td>${value.lote || ''}</td>
          <td>${value.tamanoMuestra || ''}</td>
          <td>${value.empaque?.b ? 'B ' : ''}${value.empaque?.h ? 'H ' : ''}${value.empaque?.r ? 'R ' : ''}${value.empaque?.a ? 'A ' : ''}${value.empaque?.m ? 'M ' : ''}${value.empaque?.o ? 'O ' : ''}</td>
          <td>${value.empaque?.temp || ''}</td>
          <td>${value.etiquetaFabrica || ''}</td>
          <td>${value.estadoCalidad || ''}</td>
          <td>${value.bodega || ''}</td>
          <td>${value.compartimiento || ''}</td>
        </tr>
      `;
    }).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>ITEM</th>
            <th>NÚMERO DE COMPONENTE</th>
            <th>NOMBRE</th>
            <th>CANTIDAD</th>
            <th>VENCIMIENTO</th>
            <th>DOC</th>
            <th>LOTE</th>
            <th>MUESTRA</th>
            <th>EMPAQUE</th>
            <th>TEMP</th>
            <th>ETIQUETA</th>
            <th>ESTADO</th>
            <th>BODEGA</th>
            <th>COMPARTIMIENTO</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

}
