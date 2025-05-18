
// Test file with type safety issues
function processData(data: any) {
  return data.map(item => item.value * 2);
}

// Missing return type
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Implicit any
const filterItems = (items, predicate) => {
  return items.filter(predicate);
};

// @ts-ignore instead of @ts-expect-error
// @ts-ignore
const unsafeOperation = (input) => {
  return input.nonExistentMethod();
};

class DataProcessor {
  // Method with implicit return type
  process(data) {
    return data.processed;
  }

  // Method with any parameter
  validate(input) {
    return typeof input.id === 'string';
  }
}
