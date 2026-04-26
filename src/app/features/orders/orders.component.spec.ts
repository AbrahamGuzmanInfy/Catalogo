import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { OrdersComponent } from './orders.component';

describe('OrdersComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(OrdersComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrdersComponent);
    fixture.componentRef.setInput('currentUser', {
      usuario_id: '1',
      nombre: 'Dueno Demo',
      rol: 'dueno',
      email: 'dueno@petalco.test',
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
