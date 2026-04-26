import { TestBed } from '@angular/core/testing';
import { CartItemComponent } from './cart-item.component';

describe('CartItemComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartItemComponent],
    })
      .overrideComponent(CartItemComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CartItemComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
