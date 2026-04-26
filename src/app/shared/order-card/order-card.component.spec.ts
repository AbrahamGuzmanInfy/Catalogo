import { TestBed } from '@angular/core/testing';
import { OrderCardComponent } from './order-card.component';

describe('OrderCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
    })
      .overrideComponent(OrderCardComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrderCardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
