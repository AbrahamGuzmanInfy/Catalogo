'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">catalogo documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/App.html" data-type="entity-link" >App</a>
                            </li>
                            <li class="link">
                                <a href="components/AppBottomNavComponent.html" data-type="entity-link" >AppBottomNavComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AppHeaderComponent.html" data-type="entity-link" >AppHeaderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CartComponent.html" data-type="entity-link" >CartComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CartItemComponent.html" data-type="entity-link" >CartItemComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CatalogComponent.html" data-type="entity-link" >CatalogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CategoriesAdminComponent.html" data-type="entity-link" >CategoriesAdminComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CategoriesComponent.html" data-type="entity-link" >CategoriesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CategoryChipListComponent.html" data-type="entity-link" >CategoryChipListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CategoryFormComponent.html" data-type="entity-link" >CategoryFormComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/HomeShellComponent.html" data-type="entity-link" >HomeShellComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrderCardComponent.html" data-type="entity-link" >OrderCardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrdersComponent.html" data-type="entity-link" >OrdersComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProductCardComponent.html" data-type="entity-link" >ProductCardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProductDetailComponent.html" data-type="entity-link" >ProductDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProductFormComponent.html" data-type="entity-link" >ProductFormComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProductsAdminComponent.html" data-type="entity-link" >ProductsAdminComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProductViewer3d.html" data-type="entity-link" >ProductViewer3d</a>
                            </li>
                            <li class="link">
                                <a href="components/SearchBarComponent.html" data-type="entity-link" >SearchBarComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/UserComponent.html" data-type="entity-link" >UserComponent</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/CartState.html" data-type="entity-link" >CartState</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CatalogService.html" data-type="entity-link" >CatalogService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MediaUploadService.html" data-type="entity-link" >MediaUploadService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/NavigationState.html" data-type="entity-link" >NavigationState</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/OrderService.html" data-type="entity-link" >OrderService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SessionState.html" data-type="entity-link" >SessionState</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/CartItem.html" data-type="entity-link" >CartItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CategoriesResponse.html" data-type="entity-link" >CategoriesResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Category.html" data-type="entity-link" >Category</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CategoryUpsertPayload.html" data-type="entity-link" >CategoryUpsertPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CreateVentaPayload.html" data-type="entity-link" >CreateVentaPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CreateVentaResponse.html" data-type="entity-link" >CreateVentaResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PresignUploadResponse.html" data-type="entity-link" >PresignUploadResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Product.html" data-type="entity-link" >Product</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProductsResponse.html" data-type="entity-link" >ProductsResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProductUpsertPayload.html" data-type="entity-link" >ProductUpsertPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TestUser.html" data-type="entity-link" >TestUser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Venta.html" data-type="entity-link" >Venta</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VentaDetalle.html" data-type="entity-link" >VentaDetalle</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VentasResponse.html" data-type="entity-link" >VentasResponse</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});