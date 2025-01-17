class Category {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: "",
      image: ""
    };
  }
}
class Product {
  constructor(id, categoryId, name, price, stock) {
    this.id = id;
    this.categoryId = categoryId;
    this.name = name;
    this.price = parseInt(price);
    this.stock = stock;
  }
  toJSON() {
    return {
      id: this.id,
      categoryId: this.categoryId,
      name: this.name,
      description: "",
      price: this.price,
      stock: this.stock,
      available: this.stock > 0,
      image: "",
      category: this.categoryId
    };
  }
}
class InventoryManager {
  constructor() {
    let savedCategories = JSON.parse(localStorage.getItem('categories')) || [];
    let savedProducts = JSON.parse(localStorage.getItem('products')) || [];
    if (savedCategories.length === 0) {
      savedCategories = JSON.parse(localStorage.getItem('menuCategories')) || [];
    }
    if (savedProducts.length === 0) {
      savedProducts = JSON.parse(localStorage.getItem('menuItems')) || [];
    }
    this.categories = savedCategories.map(cat => new Category(cat.id, cat.name));
    this.products = savedProducts.map(prod => new Product(prod.id, prod.categoryId || prod.category, prod.name, prod.price, prod.stock || 0));
    this.movements = JSON.parse(localStorage.getItem('movements') || '[]').map(m => new InventoryMovement(m.id, m.productId, m.type, m.quantity, m.description, m.finalStock));
    this.bindEvents();
    this.bindPrintEvents();
    this.refreshTables();
    this.updateCategorySelect();
    this.updateCategoryFilter();
    this.updateMovementProductSelect();
    this.updateMovementsTable();
  }
  bindEvents() {
    document.getElementById('categoryForm').addEventListener('submit', e => {
      e.preventDefault();
      this.addCategory();
    });
    document.getElementById('productForm').addEventListener('submit', e => {
      e.preventDefault();
      this.addProduct();
    });
    document.getElementById('productSearch').addEventListener('input', e => {
      this.refreshTables();
    });
    document.getElementById('categoryFilter').addEventListener('change', e => {
      this.refreshTables();
    });
    document.getElementById('downloadBackup').addEventListener('click', () => {
      this.downloadBackup();
    });
    document.getElementById('restoreBackup').addEventListener('change', e => {
      if (e.target.files.length > 0) {
        if (confirm('¿Está seguro de restaurar la copia de seguridad? Esto reemplazará todos los datos actuales.')) {
          this.restoreFromBackup(e.target.files[0]);
        }
        e.target.value = '';
      }
    });
    document.getElementById('movementForm').addEventListener('submit', e => {
      e.preventDefault();
      const productId = document.getElementById('movementProduct').value;
      const type = document.getElementById('movementType').value;
      const quantity = parseInt(document.getElementById('movementQuantity').value);
      const description = document.getElementById('movementDescription').value.trim();
      if (this.registerMovement(productId, type, quantity, description)) {
        e.target.reset();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = ' Movimiento registrado correctamente';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    });
    document.getElementById('clearAllHistory').addEventListener('click', () => {
      this.clearAllMovements();
    });
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth'
          });
        }
      });
    });
  }
  bindPrintEvents() {
    document.getElementById('printMovements').addEventListener('click', () => {
      this.printMovementsPDF();
    });
  }
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  addCategory() {
    const nameInput = document.getElementById('categoryName');
    const name = nameInput.value.trim();
    if (name) {
      const category = new Category(String(Date.now()), name);
      this.categories.push(category);
      this.saveCategories();
      this.refreshTables();
      this.updateCategorySelect();
      this.updateCategoryFilter();
      this.updateMovementProductSelect();
      nameInput.value = '';
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = '✨ Categoría creada correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }
  addProduct() {
    const categoryId = document.getElementById('productCategory').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    if (categoryId && name && !isNaN(price) && price >= 0 && stock >= 0) {
      const product = new Product(String(Date.now()), categoryId, name, price, stock);
      this.products.push(product);
      this.saveProducts();
      this.refreshTables();
      this.updateMovementProductSelect();
      document.getElementById('productForm').reset();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = '✨ Producto creado correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }
  deleteCategory(id) {
    const category = this.categories.find(cat => cat.id === id);
    if (!category) return;
    const productsInCategory = this.products.filter(prod => prod.categoryId === id);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
      <div class="modal-header">
        <h3> Eliminar Categoría</h3> 
      </div>
      <div>
        <p>¿Está seguro que desea eliminar la categoría "${category.name}"?</p>
        ${productsInCategory.length > 0 ? `
          <p style="margin-top: 10px; color: var(--danger)">
            Esta categoría tiene ${productsInCategory.length} producto(s) asociado(s).<br>
            Al eliminarla, también se eliminarán todos estos productos.
          </p>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">
          Cancelar
        </button>
        <button class="modal-btn modal-btn-confirm" style="background: var(--danger)">
          Eliminar
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.appendChild(dialog);
    dialog.querySelector('.modal-btn-cancel').onclick = () => {
      overlay.remove();
    };
    dialog.querySelector('.modal-btn-confirm').onclick = () => {
      this.categories = this.categories.filter(cat => cat.id !== id);
      this.products = this.products.filter(prod => prod.categoryId !== id);
      this.saveCategories();
      this.saveProducts();
      this.refreshTables();
      this.updateCategorySelect();
      this.updateCategoryFilter();
      this.updateMovementProductSelect();
      overlay.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = ' Categoría eliminada correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    };
  }
  editCategory(id) {
    const category = this.categories.find(cat => cat.id === id);
    if (!category) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
      <div class="modal-header">
        <h3> Editar Categoría</h3>
      </div>
      <div>
        <input type="text" id="newCategoryName" 
          class="modal-input"
          value="${category.name}" 
          placeholder="Nombre de la categoría">
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">
          Cancelar
        </button>
        <button class="modal-btn modal-btn-confirm">
          Guardar
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.appendChild(dialog);
    const input = dialog.querySelector('#newCategoryName');
    input.focus();
    input.select();
    dialog.querySelector('.modal-btn-cancel').onclick = () => {
      overlay.remove();
    };
    dialog.querySelector('.modal-btn-confirm').onclick = () => {
      const newName = input.value.trim();
      if (!newName) {
        input.focus();
        return;
      }
      category.name = newName;
      this.saveCategories();
      this.refreshTables();
      this.updateCategorySelect();
      this.updateCategoryFilter();
      this.updateMovementProductSelect();
      overlay.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = ' Categoría actualizada correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    };
    input.addEventListener('keyup', e => {
      if (e.key === 'Enter') {
        dialog.querySelector('.modal-btn-confirm').click();
      } else if (e.key === 'Escape') {
        dialog.querySelector('.modal-btn-cancel').click();
      }
    });
  }
  editProduct(id) {
    const product = this.products.find(prod => prod.id === id);
    if (!product) return;
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      min-width: 300px;
    `;
    dialog.innerHTML = `
      <h3 style="margin-bottom: 15px;"> Editar Producto</h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Nombre:</label>
        <input type="text" id="editName" value="${product.name}" 
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Precio:</label>
        <input type="number" id="editPrice" value="${product.price}"
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Stock:</label>
        <input type="number" id="editStock" value="${product.stock}"
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="this.parentElement.parentElement.remove(); document.getElementById('editOverlay').remove();" 
          style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
          Cancelar
        </button>
        <button id="saveEdit" 
          style="padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
          Guardar
        </button>
      </div>
    `;
    const overlay = document.createElement('div');
    overlay.id = 'editOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    const saveButton = document.getElementById('saveEdit');
    saveButton.addEventListener('click', () => {
      const newName = document.getElementById('editName').value.trim();
      const newPrice = parseInt(document.getElementById('editPrice').value);
      const newStock = parseInt(document.getElementById('editStock').value);
      if (!newName || isNaN(newPrice) || isNaN(newStock) || newPrice < 0 || newStock < 0) {
        alert('Por favor ingrese valores válidos');
        return;
      }
      product.name = newName;
      product.price = newPrice;
      product.stock = newStock;
      this.saveProducts();
      this.refreshTables();
      this.updateMovementProductSelect();
      dialog.remove();
      overlay.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = ' Producto actualizado correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    });
  }
  registerMovement(productId, type, quantity, description) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return false;
    if (type === 'salida' && product.stock < quantity) {
      alert('No hay suficiente stock para realizar esta salida');
      return false;
    }
    product.stock = type === 'entrada' ? product.stock + quantity : product.stock - quantity;
    const movement = new InventoryMovement(String(Date.now()), productId, type, quantity, description, product.stock);
    this.movements.push(movement);
    this.saveMovements();
    this.saveProducts();
    this.refreshTables();
    this.updateMovementsTable();
    this.updateMovementProductSelect();
    return true;
  }
  deleteMovement(id) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
      <div class="modal-header">
        <h3> Eliminar Registro</h3>
      </div>
      <div>
        <p>¿Está seguro que desea eliminar este registro del historial?</p>
        <p style="margin-top: 10px; color: var(--warning)">
          Esta acción no se puede deshacer.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">
          Cancelar
        </button>
        <button class="modal-btn modal-btn-confirm" style="background: var(--danger)">
          Eliminar
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.appendChild(dialog);
    dialog.querySelector('.modal-btn-cancel').onclick = () => {
      overlay.remove();
    };
    dialog.querySelector('.modal-btn-confirm').onclick = () => {
      this.movements = this.movements.filter(m => m.id !== id);
      this.saveMovements();
      this.updateMovementsTable();
      overlay.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = ' Registro eliminado correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    };
  }
  clearAllMovements() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
      <div class="modal-header">
        <h3> Borrar Todo el Historial</h3>
      </div>
      <div>
        <p>¿Está seguro que desea borrar todo el historial de movimientos?</p>
        <p style="margin-top: 10px; color: var(--danger)">
          Esta acción eliminará permanentemente todos los registros del historial.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">
          Cancelar
        </button>
        <button class="modal-btn modal-btn-confirm" style="background: var(--danger)">
          Borrar Todo
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.appendChild(dialog);
    dialog.querySelector('.modal-btn-cancel').onclick = () => {
      overlay.remove();
    };
    dialog.querySelector('.modal-btn-confirm').onclick = () => {
      this.movements = [];
      this.saveMovements();
      this.updateMovementsTable();
      overlay.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = ' Historial borrado completamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    };
  }
  downloadBackup() {
    const backup = {
      categories: this.categories.map(cat => cat.toJSON()),
      products: this.products.map(prod => prod.toJSON()),
      movements: this.movements.map(m => m.toJSON())
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = ' Copia de seguridad descargada correctamente';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  restoreFromBackup(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const backup = JSON.parse(e.target.result);
        if (backup.categories && Array.isArray(backup.categories) && backup.products && Array.isArray(backup.products) && backup.movements && Array.isArray(backup.movements)) {
          this.categories = backup.categories.map(cat => new Category(cat.id, cat.name));
          this.products = backup.products.map(prod => new Product(prod.id, prod.categoryId || prod.category, prod.name, prod.price, prod.stock || 0));
          this.movements = backup.movements.map(m => new InventoryMovement(m.id, m.productId, m.type, m.quantity, m.description, m.finalStock));
          this.saveCategories();
          this.saveProducts();
          this.saveMovements();
          this.refreshTables();
          this.updateCategorySelect();
          this.updateCategoryFilter();
          this.updateMovementProductSelect();
          this.updateMovementsTable();
          alert(' Copia de seguridad restaurada con éxito');
        } else {
          throw new Error('Formato de archivo inválido');
        }
      } catch (error) {
        alert(' Error al restaurar la copia de seguridad: ' + error.message);
      }
    };
    reader.readAsText(file);
  }
  saveCategories() {
    const categoriesData = this.categories.map(cat => cat.toJSON());
    localStorage.setItem('categories', JSON.stringify(categoriesData));
    localStorage.setItem('menuCategories', JSON.stringify(categoriesData));
  }
  saveProducts() {
    const productsData = this.products.map(prod => prod.toJSON());
    localStorage.setItem('products', JSON.stringify(productsData));
    localStorage.setItem('menuItems', JSON.stringify(productsData));
  }
  saveMovements() {
    localStorage.setItem('movements', JSON.stringify(this.movements));
  }
  updateCategorySelect() {
    const select = document.getElementById('productCategory');
    select.innerHTML = '';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  }
  updateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">Todas las categorías</option>';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  }
  updateMovementProductSelect() {
    const select = document.getElementById('movementProduct');
    select.innerHTML = '';
    this.products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  }
  updateMovementsTable() {
    const tbody = document.querySelector('#movementsTable tbody');
    tbody.innerHTML = '';
    this.movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(movement => {
      const product = this.products.find(p => p.id === movement.productId);
      if (!product) return;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(movement.timestamp).toLocaleString()}</td>
        <td>${product.name}</td>
        <td>${movement.type === 'entrada' ? ' Entrada' : ' Salida'}</td>
        <td>${movement.quantity}</td>
        <td>${movement.finalStock}</td>
        <td>${movement.description}</td>
        <td>
          <button class="btn btn-danger" onclick="inventoryManager.deleteMovement('${movement.id}')">
            <span></span> Eliminar
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  getStockClass(stock) {
    if (stock <= 5) return 'stock-critical';
    if (stock <= 10) return 'stock-warning';
    return '';
  }
  refreshTables() {
    const categoryBody = document.querySelector('#categoryTable tbody');
    categoryBody.innerHTML = '';
    this.categories.forEach(category => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${category.name}</td>
        <td>
          <button class="btn btn-warning" onclick="inventoryManager.editCategory('${category.id}')">
            <span></span> Editar
          </button>
          <button class="btn btn-danger" onclick="inventoryManager.deleteCategory('${category.id}')">
            <span></span> Eliminar
          </button>
        </td>
      `;
      categoryBody.appendChild(row);
    });
    const productBody = document.querySelector('#productTable tbody');
    productBody.innerHTML = '';
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    let filteredProducts = this.products;
    if (searchTerm) {
      filteredProducts = filteredProducts.filter(product => product.name.toLowerCase().includes(searchTerm));
    }
    if (categoryFilter) {
      filteredProducts = filteredProducts.filter(product => product.categoryId === categoryFilter);
    }
    filteredProducts.forEach(product => {
      const category = this.categories.find(cat => cat.id === product.categoryId);
      const row = document.createElement('tr');
      row.className = this.getStockClass(product.stock);
      row.innerHTML = `
        <td>${category ? category.name : 'Sin categoría'}</td>
        <td>${product.name}</td>
        <td>${this.formatCurrency(product.price)}</td>
        <td>${product.stock}</td>
        <td>
          <button class="btn btn-warning" onclick="inventoryManager.editProduct('${product.id}')">
            <span></span> Editar
          </button>
          <button class="btn btn-danger" onclick="inventoryManager.deleteProduct('${product.id}')">
            <span></span> Eliminar
          </button>
        </td>
      `;
      productBody.appendChild(row);
    });
    this.updateMovementProductSelect();
    this.updateMovementsTable();
  }
  deleteProduct(id) {
    if (!confirm('¿Está seguro que desea eliminar este producto?')) return;
    this.products = this.products.filter(prod => prod.id !== id);
    this.saveProducts();
    this.refreshTables();
    this.updateMovementProductSelect();
  }
  printMovementsPDF() {
    let printContent = `
      <html>
        <head>
          <title>Historial de Movimientos</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10px;
            }
            table { 
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 14px;
            }
            th, td { 
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th { background: #f5f5f5; }
            h1 { 
              color: #2c3e50;
              font-size: 1.5rem;
            }
            @media print {
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1> Historial de Movimientos de Inventario</h1>
          <p>Fecha de impresión: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Stock Final</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
    `;
    this.movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(movement => {
      const product = this.products.find(p => p.id === movement.productId);
      if (!product) return;
      printContent += `
          <tr>
            <td>${new Date(movement.timestamp).toLocaleString()}</td>
            <td>${product.name}</td>
            <td>${movement.type === 'entrada' ? ' Entrada' : ' Salida'}</td>
            <td>${movement.quantity}</td>
            <td>${movement.finalStock}</td>
            <td>${movement.description}</td>
          </tr>
        `;
    });
    printContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
      printWindow.onafterprint = function () {
        printWindow.close();
      };
    };
  }
}
class InventoryMovement {
  constructor(id, productId, type, quantity, description, finalStock) {
    this.id = id;
    this.productId = productId;
    this.type = type;
    this.quantity = quantity;
    this.description = description;
    this.timestamp = new Date().toISOString();
    this.finalStock = finalStock;
  }
  toJSON() {
    return {
      id: this.id,
      productId: this.productId,
      type: this.type,
      quantity: this.quantity,
      description: this.description,
      timestamp: this.timestamp,
      finalStock: this.finalStock
    };
  }
}
const inventoryManager = new InventoryManager();