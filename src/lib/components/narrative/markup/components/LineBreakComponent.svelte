<!--
  LineBreak Component - XML Markup System
  Renders visual line breaks to separate text blocks for improved readability
-->
<script lang="ts">
  import type { MarkupComponentProps } from '../types';

  // LineBreak doesn't need node content, but accepts the prop for consistency
  let { node }: MarkupComponentProps = $props();
  
  // Suppress unused variable warning
  void node;
</script>

<!-- 
  Line break with visual spacing and subtle styling
  Uses margin for consistent spacing and a subtle visual indicator
-->
<div 
  class="divider"
  role="separator"
  aria-hidden="true"
>
~
</div>