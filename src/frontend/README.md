# SageMind Frontend

The frontend interface for the SageMind project.

## Development

```bash
pnpm install
pnpm dev
```

## UI Components

### Confirmation Dialog

We've implemented a styled confirmation dialog system to replace the default browser `window.confirm()`.

#### Example

```tsx
import { useConfirmation } from '@/hooks/use-confirmation'

function YourComponent() {
  // Get the hooks and required component
  const { confirmDelete, confirmAction, ConfirmationDialogComponent } = useConfirmation()
  
  const handleDelete = () => {
    // Use for delete confirmations
    confirmDelete("Item name", () => {
      // This code runs when user confirms
      console.log("User confirmed deletion!")
      deleteItem()
    })
  }
  
  const handleCustomAction = () => {
    // Use for custom confirmations
    confirmAction({
      title: "Custom Title",
      description: "Are you sure you want to do this?",
      cancelText: "No",
      confirmText: "Yes",
      variant: "default", // or "destructive"
      icon: <YourIcon className="h-6 w-6 text-blue-500" /> // optional
    }, () => {
      // This code runs when user confirms
      console.log("User confirmed!")
    })
  }
  
  return (
    <div>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={handleCustomAction}>Other Action</button>
      
      {/* Required: Include this component to render the dialog */}
      <ConfirmationDialogComponent />
    </div>
  )
}
```

#### Features

- **Themed UI**: Matches your application design
- **Animations**: Smooth transitions and animations
- **Customization**: Title, description, button text, icons
- **Variants**: Default and destructive (red) styling
- **Keyboard accessible**: Works with keyboard navigation
- **Mobile friendly**: Responsive design

#### Demo

Visit `/confirmation-example` to see a demo of all confirmation dialog variants. 