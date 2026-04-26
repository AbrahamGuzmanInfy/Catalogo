import { TestBed } from '@angular/core/testing';
import { ProductViewer3d } from './product-viewer-3d.component';

describe('ProductViewer3d', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductViewer3d],
    })
      .overrideComponent(ProductViewer3d, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ProductViewer3d);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

